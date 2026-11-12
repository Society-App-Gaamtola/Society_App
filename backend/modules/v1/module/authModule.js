import crypto from "crypto";
import bcrypt from "bcryptjs";
import common from "../../../config/common.js";
import Codes from "../../../config/status_codes.js";
import constant from "../../../config/constant.js";
import middleware from "../../../middleware/middleware.js";
import db from "../../../config/db.js";
import query from "../../../config/dbHelper.js";
import { createOtpWmailTemplate } from "../../../config/mail.js";

const { OTP_EXPIRY_MINUTES, OTP_RESEND_SECONDS, BCRYPT_ROUNDS, MAX_OTP_ATTEMPTS, OTP_PURPOSE, LOGGED_OUT_DEVICE } = constant;

// Outside production the OTP is always DEV_OTP so the flow can be tested without a real mailbox
const generateOtp = () => {
    return process.env.NODE_ENV === "production"
        ? String(crypto.randomInt(100000, 1000000))
        : constant.DEV_OTP;
};

// Returns an error message key if the mobile or email is already registered, otherwise null
const findSignupConflict = async ({ email, country_code, mobile_number }) => {
    const isMobileUnique = await common.checkunique("users", { country_code, mobile: mobile_number });
    if (!isMobileUnique) {
        return "rest_user_mobile_already_exists";
    }

    const isEmailUnique = await common.checkunique("users", { email });
    return isEmailUnique ? null : "rest_email_already_exists";
};

// "Login with OTP" lookup: returns { user } or { errorKey }
const findOtpLoginUser = async (country_code, mobile_number) => {
    const user = await common.getUserDetails({ country_code, mobile_number });
    if (!user) {
        return { errorKey: "rest_user_mobile_not_found" };
    }
    return common.isAccountInactive(user) ? { errorKey: "rest_account_inactive" } : { user };
};

// Checks the newest OTP and marks it verified. Returns an error message key, or null when the OTP is correct
// With user_id, only an OTP requested by that user counts
const consumeOtp = async (email, otp_purpose, otp, user_id = null) => {
    const [otpRows] = await db.query(
        `SELECT id, otp_code, is_verified, expires_at > NOW() AS is_valid FROM otp_codes
         WHERE destination = ? AND purpose = ? ${user_id ? "AND user_id = ?" : ""}
         ORDER BY id DESC LIMIT 1`,
        user_id ? [email, otp_purpose, user_id] : [email, otp_purpose],
    );
    const otpRecord = otpRows[0];

    if (!otpRecord || otpRecord.is_verified) {
        return "rest_invalid_otp";
    }

    if (!otpRecord.is_valid) {
        return "rest_expired_otp";
    }
    
    // Counted before comparing, so guesses sent at the same time can't get past the limit
    const [counted] = await query.updateQuery(
        "otp_codes",
        "attempts = attempts + 1",
        "id = ? AND attempts < ?",
        [otpRecord.id, MAX_OTP_ATTEMPTS],
    );
    if (counted.affectedRows === 0) {
        return "rest_otp_attempts_exceeded";
    }

    if (otpRecord.otp_code !== String(otp)) {
        return "rest_invalid_otp";
    }

    // is_verified = 0 in the condition, so two requests sent together can't both use the same OTP
    const [verified] = await query.updateQuery(
        "otp_codes",
        "is_verified = 1, used_at = NOW()",
        "id = ? AND is_verified = 0",
        [otpRecord.id],
    );
    return verified.affectedRows === 0 ? "rest_invalid_otp" : null;
};

// Saves only what was sent, so a missing address or photo keeps its old value
// A new photo replaces the old one: its file is deleted once the new one is saved
const saveProfile = async (user_id, address, file) => {
    const profileData = {};
    if (address !== undefined) {
        profileData.address_line1 = address;
    }

    let oldPhoto = null;
    if (file) {
        profileData.photo_url = file.filename;
        const [rows] = await db.query("SELECT photo_url FROM user_profiles WHERE user_id = ?", [user_id]);
        oldPhoto = rows[0]?.photo_url;
    }

    if (Object.keys(profileData).length === 0) {
        return;
    }

    await db.query("INSERT INTO user_profiles SET ? ON DUPLICATE KEY UPDATE ?", [{ user_id, ...profileData }, profileData]);

    if (oldPhoto) {
        await common.deleteUpload(oldPhoto);
    }
};

// A deleted account still holds its email / mobile, and two requests can both pass the unique checks
const sendSaveError = (res, where, error) => {
    if (error.code === "ER_DUP_ENTRY") {
        const msgKey = error.message.includes("uq_users_email") ? "rest_email_already_exists" : "rest_user_mobile_already_exists";
        return middleware.sendError(res, msgKey);
    }
    return middleware.sendServerError(res, where, error);
};

const authModule = {
    // Mail a new OTP (blocked for OTP_RESEND_SECONDS after the previous one)
    // Only the newest OTP is usable: consumeOtp looks at nothing older
    // Returns { sent, resend_after_seconds }
    async issueOtp({ user_id = null, email, otp_purpose }) {
        const [lastOtp] = await db.query(
            `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age FROM otp_codes
             WHERE destination = ? AND purpose = ?
             ORDER BY id DESC LIMIT 1`,
            [email, otp_purpose],
        );
        if (lastOtp.length > 0 && lastOtp[0].age < OTP_RESEND_SECONDS) {
            return { sent: false, resend_after_seconds: OTP_RESEND_SECONDS - lastOtp[0].age };
        }

        // Mail goes first: if it fails, no OTP row starts the resend timer
        const otp = generateOtp();
        const mail = await common.sendOtpMail({
            toEmail: email,
            subject: "Your verification OTP",
            htmlMessage: createOtpWmailTemplate({ otp, otpType: otp_purpose }),
        });
        if (mail.skipped && process.env.NODE_ENV === "production") {
            throw new Error(`OTP mail not sent: ${mail.reason}`);
        }

        // Expiry is calculated by MySQL so it matches NOW() used when verifying
        await db.query(
            `INSERT INTO otp_codes (user_id, destination, channel, purpose, otp_code, expires_at)
             VALUES (?, ?, 'email', ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [user_id, email, otp_purpose, otp, OTP_EXPIRY_MINUTES],
        );

        return { sent: true, resend_after_seconds: OTP_RESEND_SECONDS };
    },

    // Shared by password login and OTP verification
    // Profile not finished yet → code PROFILE_SETUP_PENDING so the app opens the Profile & Address screen
    sendLoginResponse(res, user, token) {
        const profileDone = user.signup_step === "completed";
        return middleware.sendApiResponse(
            res,
            Codes.SUCCESS,
            profileDone ? Codes.RESPONSE_SUCCESS : Codes.PROFILE_SETUP_PENDING,
            profileDone ? "rest_login_successful" : "rest_profile_setup_pending",
            { userData: common.sanitizeUser(user), token },
        );
    },

    // Signup step 0 – Personal Details
    // Flow: Check mobile / email → Mail OTP (no user and no token yet: the app keeps the details until /verify-otp)
    async signUp(request, res) {
        try {
            const { email, country_code, mobile_number } = request;

            const conflictKey = await findSignupConflict(request);
            if (conflictKey) {
                return middleware.sendError(res, conflictKey);
            }

            const { resend_after_seconds } = await this.issueOtp({ email, otp_purpose: OTP_PURPOSE.SIGNUP });

            return middleware.sendSuccess(res, "rest_signup_otp_sent", {
                email,
                country_code,
                mobile_number,
                steps: 0,
                resend_after_seconds,
            });
        } catch (error) {
            return middleware.sendServerError(res, "signUp", error);
        }
    },

    // Login with password (email OR mobile number)
    // Flow: Check credentials → Generate token
    async login(request, res) {
        try {
            const { email, country_code, mobile_number, password } = request;

            const user = await common.getUserDetails(email ? { email } : { country_code, mobile_number });

            if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
                return middleware.sendError(res, "rest_invalid_login_credentials");
            }

            if (common.isAccountInactive(user)) {
                return middleware.sendError(res, "rest_account_inactive");
            }

            const token = await common.generateToken(user, request);
            return this.sendLoginResponse(res, user, token);
        } catch (error) {
            return middleware.sendServerError(res, "login", error);
        }
    },

    // "Login with OTP" and "Resend OTP"
    async sendOtp(request, res) {
        try {
            const { email, country_code, mobile_number, otp_purpose } = request;

            let otpTarget;
            if (otp_purpose === OTP_PURPOSE.SIGNUP) {
                const isEmailUnique = await common.checkunique("users", { email });
                if (!isEmailUnique) {
                    return middleware.sendError(res, "rest_email_already_exists");
                }
                otpTarget = { email };
            } else {
                const { user, errorKey } = await findOtpLoginUser(country_code, mobile_number);
                if (errorKey) {
                    return middleware.sendError(res, errorKey);
                }
                otpTarget = { user_id: user.id, email: user.email };
            }

            const { sent, resend_after_seconds } = await this.issueOtp({ ...otpTarget, otp_purpose });
            return sent
                ? middleware.sendSuccess(res, "rest_keywords_otp_sent", { resend_after_seconds })
                : middleware.sendError(res, "rest_otp_wait_before_resend", { resend_after_seconds });
        } catch (error) {
            return middleware.sendServerError(res, "sendOtp", error);
        }
    },

    // Verify OTP for sign-up or OTP login
    // Sign-up flow: Check mobile / email → Check OTP → Create user at step 1 → Generate token
    async verifyOtp(request, res) {
        try {
            const { email, country_code, mobile_number, password, language, otp, otp_purpose } = request;

            let user;
            if (otp_purpose === OTP_PURPOSE.SIGNUP) {
                // Checked before the OTP so a taken mobile number doesn't use up the OTP
                const conflictKey = await findSignupConflict(request);
                if (conflictKey) {
                    return middleware.sendError(res, conflictKey);
                }

                const otpError = await consumeOtp(email, otp_purpose, otp);
                if (otpError) {
                    return middleware.sendError(res, otpError);
                }

                // Normal Members join without manual approval (role_id defaults to member)
                // full_name is collected on the Profile & Address screen
                const [result] = await query.insertQuery("users", {
                    email,
                    country_code,
                    mobile: mobile_number,
                    password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
                    preferred_language: language,
                    full_name: "",
                    email_verified_at: new Date(),
                    signup_step: "profile_pending",
                });
                user = await common.getUserDetails({ id: result.insertId });
            } else {
                const found = await findOtpLoginUser(country_code, mobile_number);
                if (found.errorKey) {
                    return middleware.sendError(res, found.errorKey);
                }

                const otpError = await consumeOtp(found.user.email, otp_purpose, otp);
                if (otpError) {
                    return middleware.sendError(res, otpError);
                }
                user = found.user;
            }

            const token = await common.generateToken(user, request);
            return this.sendLoginResponse(res, user, token);
        } catch (error) {
            return sendSaveError(res, "verifyOtp", error);
        }
    },

    // Signup step 1 → 2 – Profile & Address ("Create Account")
    async completeProfile(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { username, address } = request.body;

            await saveProfile(user_id, address, request.file);

            // accept_terms is enforced by completeProfileSchema; IGNORE keeps the first acceptance of this version
            await db.query("INSERT IGNORE INTO declaration_acceptances SET ?", [{
                user_id,
                declaration_version: constant.DECLARATION_VERSION,
                ip_address: request.ip,
            }]);

            // Last, so a failure above leaves the user on the Profile & Address screen to retry
            await query.updateQuery("users", { full_name: username, signup_step: "completed" }, "id = ?", [user_id]);

            const userData = await common.getUserDetails({ id: user_id });
            if (!userData) {
                return middleware.sendError(res, "rest_user_not_found");
            }

            return middleware.sendSuccess(res, "rest_profile_completed_successfully", {
                userData: common.sanitizeUser(userData),
            });
        } catch (error) {
            return middleware.sendServerError(res, "completeProfile", error);
        }
    },

    // The logged-in user's current details, so the app can refresh what it saved at login
    async getProfile(request, res) {
        try {
            const user = await common.getUserDetails({ id: request.loginUser.id });
            if (!user) {
                return middleware.sendError(res, "rest_user_not_found");
            }
            return middleware.sendSuccess(res, "rest_keywords_success", { userData: common.sanitizeUser(user) });
        } catch (error) {
            return middleware.sendServerError(res, "getProfile", error);
        }
    },

    // Username, address and photo are saved straight away. A new email is saved only after /verify-email-change
    // The mobile number can't be changed (editProfileSchema refuses it)
    async editProfile(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { username, address, email } = request.body;

            const user = await common.getUserDetails({ id: user_id });
            if (!user) {
                return middleware.sendError(res, "rest_user_not_found");
            }

            // Sending the current email again is not a change, so it needs no OTP and raises no error
            const isEmailChanging = !!email && email !== user.email.toLowerCase();
            let resend_after_seconds;
            if (isEmailChanging) {
                const isEmailUnique = await common.checkunique("users", { email }, user_id);
                if (!isEmailUnique) {
                    return middleware.sendError(res, "rest_email_already_exists");
                }

                // Before saving anything, so a failed mail leaves the profile untouched
                ({ resend_after_seconds } = await this.issueOtp({ user_id, email, otp_purpose: OTP_PURPOSE.EMAIL_CHANGE }));
            }

            await saveProfile(user_id, address, request.file);
            if (username) {
                await query.updateQuery("users", { full_name: username }, "id = ?", [user_id]);
            }

            const userData = common.sanitizeUser(await common.getUserDetails({ id: user_id }));
            return isEmailChanging
                ? middleware.sendSuccess(res, "rest_email_change_otp_sent", { userData, new_email: email, resend_after_seconds })
                : middleware.sendSuccess(res, "rest_profile_updated_successfully", { userData });
        } catch (error) {
            return middleware.sendServerError(res, "editProfile", error);
        }
    },

    // Second half of a change of email started in editProfile
    async verifyEmailChange(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { email, otp } = request.body;

            // The email may have been taken since the OTP was sent
            const isEmailUnique = await common.checkunique("users", { email }, user_id);
            if (!isEmailUnique) {
                return middleware.sendError(res, "rest_email_already_exists");
            }

            const otpError = await consumeOtp(email, OTP_PURPOSE.EMAIL_CHANGE, otp, user_id);
            if (otpError) {
                return middleware.sendError(res, otpError);
            }

            await query.updateQuery("users", { email, email_verified_at: new Date() }, "id = ?", [user_id]);

            return middleware.sendSuccess(res, "rest_email_updated_successfully", {
                userData: common.sanitizeUser(await common.getUserDetails({ id: user_id })),
            });
        } catch (error) {
            return sendSaveError(res, "verifyEmailChange", error);
        }
    },

    // This device stays logged in, every other device of the user is logged out
    async changePassword(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { old_password, new_password } = request.body;

            const user = await common.getUserDetails({ id: user_id });
            if (!user) {
                return middleware.sendError(res, "rest_user_not_found");
            }

            if (!(await bcrypt.compare(old_password, user.password_hash))) {
                return middleware.sendError(res, "rest_old_password_incorrect");
            }

            const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
            await query.updateQuery("users", { password_hash }, "id = ?", [user_id]);

            // status = 'active' leaves blocked devices blocked
            await query.updateQuery(
                "user_devices",
                LOGGED_OUT_DEVICE,
                "user_id = ? AND refresh_token_hash != ? AND status = 'active'",
                [user_id, common.hashToken(middleware.getBearerToken(request))],
            );

            return middleware.sendSuccess(res, "rest_password_changed_successfully");
        } catch (error) {
            return middleware.sendServerError(res, "changePassword", error);
        }
    },

    // Logout: remove the token from this device only. Other devices stay logged in
    async logout(request, res) {
        try {
            const token = middleware.getBearerToken(request);
            if (!token) {
                return middleware.sendError(res, "rest_already_logged_out");
            }

            const [result] = await query.updateQuery(
                "user_devices",
                LOGGED_OUT_DEVICE,
                "refresh_token_hash = ? AND status = 'active'",
                [common.hashToken(token)],
            );
            if (result.affectedRows === 0) {
                return middleware.sendError(res, "rest_already_logged_out");
            }

            return middleware.sendSuccess(res, "rest_logout_successful");
        } catch (error) {
            return middleware.sendServerError(res, "logout", error);
        }
    },
};

export default authModule;
