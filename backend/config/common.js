import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import db from "../config/db.js";
import query from "../config/dbHelper.js";
import constant from "../config/constant.js";

// Role code comes from roles, address and photo from user_profiles
const USER_SELECT = `SELECT u.*, r.code AS role, p.address_line1 AS address, p.photo_url AS profile_image
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN user_profiles p ON p.user_id = u.id`;

const { TOKEN_EXPIRY_DAYS, SIGNUP_STEPS, UPLOAD_DIR, DEVICE_STATUS } = constant;

const common = {
    // conditions: { column: value } – several columns are matched together, e.g. { country_code, mobile }
    // Table and column names must come from code, never from the request
    // excludeId leaves that row out, so a user's own record never counts as a duplicate
    async checkunique(table, conditions, excludeId = null) {
        try {
            const where = Object.keys(conditions).map((column) => `${column} = ?`).join(" AND ");
            const params = Object.values(conditions);
            let sql = `SELECT COUNT(*) AS count FROM ${table} WHERE ${where} AND is_deleted = 0`;
            if (excludeId) {
                sql += " AND id != ?";
                params.push(excludeId);
            }
            const [rows] = await db.query(sql, params);
            return rows[0].count === 0; // Returns true if unique, false if exists
        } catch (error) {
            console.error(`Error checking uniqueness for ${table}: `, error);
            return false; // Assume not unique on error
        }
    },
    
    // With { id }, { email } or { country_code, mobile_number } returns one user (or null), with nothing returns all users
    async getUserDetails(request) {
        const sql = `${USER_SELECT} WHERE u.is_deleted = 0`;

        let filter = null;
        let params = [];
        if (request?.id) {
            filter = "u.id = ?";
            params = [request.id];
        } else if (request?.email) {
            filter = "u.email = ?";
            params = [request.email];
        } else if (request?.mobile_number) {
            filter = "u.country_code = ? AND u.mobile = ?";
            params = [request.country_code, request.mobile_number];
        }

        if (!filter) {
            const [rows] = await db.query(`${sql} ORDER BY u.id DESC`);
            return rows;
        }

        const [rows] = await db.query(`${sql} AND ${filter} LIMIT 1`, params);
        return rows[0] || null;
    },

    // Media is a Cloudinary link, or a file name in uploads/ saved before Cloudinary was added
    mediaUrl(file) {
        if (!file) return null;
        return /^https?:\/\//.test(file) ? file : constant.IMAGE_BASE_URL + file;
    },

    // True when a Cloudinary link points into its folder (constant.MEDIA_FOLDERS) for this server's environment, e.g.
    // https://res.cloudinary.com/<cloud>/image/upload/v123/society_app/production/profiles/user_54/<file>.jpg
    // Only the text of the link is checked: no request to Cloudinary
    isInMediaFolder(url, purpose, user_id, resourceType = "image") {
        const env = process.env.NODE_ENV === "production" ? "production" : "development";
        const folder = constant.MEDIA_FOLDERS[purpose]
            .replace("{user}", String(user_id))
            .replace("{yyyy}", "\\d{4}")
            .replace("{mm}", "(0[1-9]|1[0-2])");
        const pattern = new RegExp(
            `^${constant.MEDIA_URL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${resourceType}/upload/` +
            "(?:[^/]+/)*?v\\d+/" + // optional transformations (e.g. a video thumbnail's so_1/), then the version
            `${constant.MEDIA_ROOT_FOLDER}/${env}/${folder}/[^/]+\\.[a-z0-9]+$`,
            "i",
        );
        return typeof url === "string" && pattern.test(url);
    },

    isAccountInactive(user) {
        return user.is_active == 0 || user.status === "suspended";
    },

    // Only the session token's hash is stored, so a database leak can't be replayed as a login
    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    },

    // Fields are listed one by one so the password hash and lockout columns never reach the client
    sanitizeUser(user) {
        if (!user) return null;
        return {
            id: user.id,
            role: user.role,
            username: user.full_name,
            email: user.email,
            country_code: user.country_code,
            mobile_number: user.mobile,
            profile_image: common.mediaUrl(user.profile_image),
            address: user.address ?? null,
            language: user.preferred_language,
            is_verified: user.email_verified_at ? 1 : 0,
            steps: SIGNUP_STEPS[user.signup_step],
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    },

    generateToken: async function (user, request = {}) {
        try {
            const normalizedUser = Array.isArray(user) ? user[0] : user;

            if (!normalizedUser || !normalizedUser.id) {
                throw new Error("Invalid user data for token generation");
            }

            const payload = {
                id: normalizedUser.id,
                role: normalizedUser.role || null,
                name: normalizedUser.full_name || null,
                email: normalizedUser.email || null,
                country_code: normalizedUser.country_code || null,
                mobile_number: normalizedUser.mobile || null,
            };

            const requestBody = request?.body || request || {};
            const { device_token, device_model, os_version, uuid, ip } = requestBody;

            const user_id = normalizedUser.id;
            const token = jwt.sign(payload, process.env.JWT_WEB_TOKEN, { expiresIn: `${TOKEN_EXPIRY_DAYS}d` });

            // device_uid is required by the table; a client that sends no uuid gets a new device row per login
            const device_uid = uuid || crypto.randomUUID();
            const fcm_token = device_token || null;

            // fcm_token is unique, so take it off any other row (e.g. the same phone used by another account)
            if (fcm_token) {
                await query.updateQuery(
                    "user_devices",
                    { fcm_token: null },
                    "fcm_token = ? AND NOT (user_id = ? AND device_uid = ?)",
                    [fcm_token, user_id, device_uid],
                );
            }

            const devicePayload = {
                refresh_token_hash: common.hashToken(token),
                refresh_expires_at: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
                fcm_token: fcm_token,
                device_model: device_model || null,
                os_version: os_version || null,
                last_ip: ip || null,
                last_seen_at: new Date(),
                is_active: 1,
                is_deleted: 0,
            };

            // Same physical device logging in again → refresh its row instead of adding a new one
            const checkSql = "SELECT id, status FROM user_devices WHERE user_id = ? AND device_uid = ? LIMIT 1";
            const [deviceExists] = await db.query(checkSql, [user_id, device_uid]);
            if (deviceExists.length > 0) {
                // Logging in again must not lift a block placed on this device
                const status = deviceExists[0].status === DEVICE_STATUS.BLOCKED ? DEVICE_STATUS.BLOCKED : DEVICE_STATUS.ACTIVE;
                await query.updateQuery("user_devices", { ...devicePayload, status }, "id = ?", [deviceExists[0].id]);
                return token;
            }

            await query.insertQuery("user_devices", { ...devicePayload, user_id, device_uid, status: DEVICE_STATUS.ACTIVE });
            return token;
        } catch (error) {
            console.error("Error generating token: ", error);
            throw error;
        }
    },

    sendNotification: async function (sender_id, receiver_id, title, description) {
        try {
            const [result] = await query.insertQuery("notifications", {
                type: "general",
                title: title ?? "",
                body: description ?? "",
                audience: receiver_id == null ? "all" : "selected",
                created_by: sender_id ?? null,
            });

            if (receiver_id != null) {
                await query.insertQuery("notification_recipients", {
                    notification_id: result.insertId,
                    user_id: Number(receiver_id),
                });
            }
        } catch (error) {
            console.error("Error sending notification: ", error);
        }
    },

    async sendOtpMail({ toEmail, subject, htmlMessage }) {
        if (!toEmail || !subject || !htmlMessage) {
            return { skipped: true, reason: "Missing toEmail/subject/htmlMessage" };
        }

        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
        const mailFrom = process.env.MAIL_FROM || smtpUser;

        if (!mailFrom || !smtpUser || !smtpPass) {
            return { skipped: true, reason: "Mail env is not configured" };
        }

        const smtpHost =
            process.env.SMTP_HOST && process.env.SMTP_HOST !== "smtp.example.com"
                ? process.env.SMTP_HOST
                : "smtp.gmail.com";

        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: smtpHost,
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        const info = await transporter.sendMail({
            from: mailFrom,
            to: toEmail,
            subject,
            html: htmlMessage,
        });

        return { skipped: false, messageId: info.messageId };
    },

    // Never fails the request: a file that is already gone or can't be removed must not undo the save
    async deleteUpload(filename) {
        try {
            await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(filename)));
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Error deleting upload: ", error);
            }
        }
    },

    async deleteOtp(otpId) {
        try {
            await db.query("DELETE FROM otp_codes WHERE id = ?", [otpId]);
        } catch (error) {
            console.error("Error deleting OTP: ", error);
        }
    },
};

export default common;
