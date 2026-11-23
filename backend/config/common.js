import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import db from "../config/db.js";
import query from "../config/dbHelper.js";
import constant from "../config/constant.js";
import en from "../languages/en.js";
import hi from "../languages/hn.js";
import gu from "../languages/guj.js";
import { createContentMailTemplate } from "./mail.js";

const LANGUAGE_FILES = { en, hi, gu };

// Role code comes from roles, address and photo from user_profiles
const USER_SELECT = `SELECT u.*, r.code AS role, p.address_line1 AS address, p.photo_url AS profile_image
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN user_profiles p ON p.user_id = u.id`;

const { TOKEN_EXPIRY_DAYS, SIGNUP_STEPS, UPLOAD_DIR, DEVICE_STATUS } = constant;

// app_settings, read once and kept in memory until the next save (common.saveSettings clears it)
let settingsCache = null;

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

    // The :id in the URL, or null when it isn't a valid id
    routeId(request) {
        const id = Number(request.params.id);
        return Number.isInteger(id) && id > 0 ? id : null;
    },

    // Is the logged-in user's role in this list (e.g. constant.SEE_ALL_ROLES)? Uses the role tokenMiddleware
    // already loaded, so no database query. For "who may call this API", use middleware.allowedRoles in the route
    hasRole(loginUser, roles) {
        return roles.includes(loginUser?.role);
    },

    // The owner of a row, or a role in constant.SEE_ALL_ROLES (Super Admin), may edit / delete it
    canChange(loginUser, ownerId) {
        return ownerId === loginUser?.id || common.hasRole(loginUser, constant.SEE_ALL_ROLES);
    },

    // The database stores text in English only. This returns the language file's translation of `key`
    // for `lang`, or `fallback` (the stored English text) when there is none
    translate(lang, key, fallback) {
        return LANGUAGE_FILES[lang]?.[key] ?? fallback;
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

    // ---------- App settings (app_settings: one row per key, the value is JSON) ----------

    // Every setting: what the Super Admin saved, else constant.DEFAULT_SETTINGS. Cached: no query after the first call
    async getSettings() {
        if (settingsCache) return settingsCache;
        const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings");
        const saved = {};
        for (const { setting_key, setting_value } of rows) {
            if (!(setting_key in constant.DEFAULT_SETTINGS) || setting_value == null) continue;
            try {
                saved[setting_key] = JSON.parse(setting_value);
            } catch {
                saved[setting_key] = setting_value; // a plain value typed in pgAdmin
            }
        }
        settingsCache = { ...constant.DEFAULT_SETTINGS, ...saved };
        return settingsCache;
    },

    // Saves the settings sent (only keys of DEFAULT_SETTINGS) and clears the cache
    async saveSettings(changes, conn = db) {
        for (const [setting_key, value] of Object.entries(changes)) {
            if (!(setting_key in constant.DEFAULT_SETTINGS) || value === undefined) continue;
            await query.upsertQuery("app_settings", { setting_key, setting_value: JSON.stringify(value) }, ["setting_key"], conn);
        }
        settingsCache = null;
    },

    // An alert to every Super Admin (in-app notification), when that alert is switched on in the settings
    // (settingKey = notify_new_member / notify_donation / notify_executive_request / notify_media_upload /
    // notify_expense). Never throws
    async notifyAdmins(settingKey, title, message = "", ref_type = null, ref_id = null) {
        try {
            const settings = await common.getSettings();
            if (!settings[settingKey]) return;
            const [admins] = await db.query(
                `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE r.code = ? AND u.is_deleted = 0 AND u.status = 'active'`,
                [constant.ROLES.SUPER_ADMIN],
            );
            await common.sendNotification({
                receiver_ids: admins.map((a) => a.id),
                type: settingKey === "notify_donation" ? constant.NOTIFICATION_TYPE.DONATION : constant.NOTIFICATION_TYPE.GENERAL,
                title,
                message,
                ref_type,
                ref_id,
            });
        } catch (error) {
            console.error("[notifyAdmins]", error.message);
        }
    },

    // Saves one line of the activity log (audit_logs): who (the logged-in user) did what (constant.ACTIVITY) to which
    // record. Never throws and is not awaited by callers, so it can't slow down or fail the request
    async logActivity(request, action, table_name, record_id = null) {
        try {
            await query.insertQuery("audit_logs", {
                user_id: request?.loginUser?.id ?? null,
                action,
                table_name,
                record_id,
                ip_address: request?.ip ?? null,
            });
        } catch (error) {
            console.error("[activity] Could not save:", error.message);
        }
    },

    // Login history (the Audit Logs screen): one audit_logs row per login, pointing at the session (user_devices),
    // which holds the platform and device model. `request` is the request or its body. Not awaited, never throws
    logLogin(request, user_id, device_id) {
        const ip = request?.ip ?? request?.body?.ip ?? request?.ip_address ?? null;
        common.logActivity({ loginUser: { id: user_id }, ip }, constant.ACTIVITY.LOGIN, "user_devices", device_id);
    },

    // ---------- Executive permissions (one executive_permissions row per allowed section) ----------

    // An executive's sections, e.g. { sections: ["events", "notices"] }
    // userData (sanitizeUser) + permissions: the sections an executive was given, every section for the Super Admin,
    // none for a member. For the app's login and GET /auth/profile, so it shows only the screens the user may use
    async userWithPermissions(user) {
        const userData = common.sanitizeUser(user);
        if (!userData) return null;
        if (userData.role === constant.ROLES.SUPER_ADMIN) {
            userData.permissions = { sections: [...constant.PERMISSION_SECTIONS] };
        } else if (userData.role === constant.ROLES.EXECUTIVE) {
            userData.permissions = await common.loadPermissions(userData.id);
        } else {
            userData.permissions = { sections: [] };
        }
        return userData;
    },

    async loadPermissions(user_id, conn = db) {
        const [rows] = await conn.query(
            `SELECT m.code FROM executive_permissions p
             JOIN modules m ON m.id = p.module_id
             WHERE p.user_id = ? AND p.is_active = 1 AND m.is_active = 1 AND m.is_deleted = 0`,
            [user_id],
        );
        return { sections: rows.map((r) => r.code) };
    },

    // Replaces an executive's sections. An empty list removes every permission
    async savePermissions(user_id, sections, granted_by, conn = db) {
        await conn.query("DELETE FROM executive_permissions WHERE user_id = ?", [user_id]);
        if (!sections.length) return;
        await conn.query(
            `INSERT INTO executive_permissions (user_id, module_id, can_view, can_create, can_edit, can_approve, granted_by)
             SELECT ?, m.id, 1, 1, 1, 0, ?
             FROM modules m WHERE m.code = ANY(?::text[]) AND m.is_deleted = 0`,
            [user_id, granted_by, sections],
        );
    },

    // May the logged-in user use this section? The Super Admin always; an executive when given it
    // (req.loginUser.permissions is loaded by tokenMiddleware); members never. No query
    hasPermission(user, section) {
        if (user?.role === constant.ROLES.SUPER_ADMIN) return true;
        return user?.role === constant.ROLES.EXECUTIVE && Boolean(user.permissions?.sections.includes(section));
    },

    // Gives a member the next member code (GM0001, GM0002…) if they have none. Not for the Super Admin.
    // A code the Super Admin typed by hand may already use the next number: then the one after is tried
    async assignMemberCode(user_id) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await db.query(
                    `UPDATE users SET member_code = ? || LPAD(nextval('member_code_seq')::text, ?, '0')
                     WHERE id = ? AND member_code IS NULL
                       AND role_id <> (SELECT id FROM roles WHERE code = ?)`,
                    [constant.MEMBER_CODE_PREFIX, constant.MEMBER_CODE_DIGITS, user_id, constant.ROLES.SUPER_ADMIN],
                );
                return;
            } catch (error) {
                if (error.code !== constant.DB_ERROR.UNIQUE_VIOLATION) throw error;
            }
        }
    },

    // Text for ILIKE (case-insensitive search): % and _ typed by the user are matched as plain characters
    likeText(text) {
        return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
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
            member_code: user.member_code ?? null,
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

    // Makes a login token for one role and saves its session in user_devices (sha256 of the token, the role it is
    // for, device type / model / OS / IP, FCM token). `role` is the role the token is issued for (default: the
    // user's role; the admin panel passes ROLES.SUPER_ADMIN). tokenMiddleware lets the token in only while the
    // session is active and the user still has that role; then allowedRoles checks the route
    generateToken: async function (user, request = {}, role = null) {
        try {
            const normalizedUser = Array.isArray(user) ? user[0] : user;

            if (!normalizedUser || !normalizedUser.id) {
                throw new Error("Invalid user data for token generation");
            }

            const tokenRole = role || normalizedUser.role || null;
            const payload = {
                id: normalizedUser.id,
                role: tokenRole,
                name: normalizedUser.full_name || null,
                email: normalizedUser.email || null,
                country_code: normalizedUser.country_code || null,
                mobile_number: normalizedUser.mobile || null,
            };

            const requestBody = request?.body || request || {};
            const { device_token, device_type, device_model, os_version, uuid, ip } = requestBody;

            const user_id = normalizedUser.id;
            const token = jwt.sign(payload, process.env.JWT_WEB_TOKEN, { expiresIn: `${TOKEN_EXPIRY_DAYS}d` });

            // device_uid is required by the table; a client that sends no uuid gets a new device row per login
            const device_uid = uuid || crypto.randomUUID();
            await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user_id]);
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
                role: tokenRole,
                platform: constant.DEVICE_PLATFORMS.includes(device_type) ? device_type : constant.DEVICE_PLATFORMS[0],
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
                common.logLogin(request, user_id, deviceExists[0].id);
                return token;
            }

            const [added] = await query.insertQuery("user_devices", { ...devicePayload, user_id, device_uid, status: DEVICE_STATUS.ACTIVE });
            common.logLogin(request, user_id, added.insertId);
            return token;
        } catch (error) {
            console.error("Error generating token: ", error);
            throw error;
        }
    },

    // Sends one in-app notification from a sender to its receivers. Never fails the request that called it.
    //   sender_id    who sent it (the logged-in user), or null for the system / cron
    //   receiver_ids an array of user ids, or constant.NOTIFY_EVERYONE for every member who finished sign-up
    //   type         event | notice | donation | general (constant.NOTIFICATION_TYPE)
    //   title        text, or a language key like "notify_event_approved" (translated when the user reads it)
    //   message      the body text
    //   ref_type / ref_id  what the app opens on tap (event, notice, media), optional
    //   priority     normal | high (constant.NOTIFICATION_PRIORITY), optional
    async sendNotification({
        sender_id = null, receiver_ids, type, title, message = "", ref_type = null, ref_id = null,
        priority = constant.NOTIFICATION_PRIORITY.NORMAL,
    }) {
        try {
            const toEveryone = receiver_ids === constant.NOTIFY_EVERYONE;
            if (!toEveryone && !receiver_ids?.length) return;

            // 1. The notification itself
            const [result] = await query.insertQuery("notifications", {
                type,
                priority,
                title: String(title).slice(0, constant.TITLE_MAX_LENGTH),
                body: String(message ?? "").slice(0, constant.NOTIFICATION_BODY_MAX_LENGTH),
                ref_type,
                ref_id,
                audience: toEveryone ? "all" : "selected",
                created_by: sender_id,
                sent_at: new Date(),
            });

            // 2. One row per receiver, so each user has their own read / unread state (active, signed-up users only).
            // Users who switched this type off in the app's Settings are left out (the column name comes from code)
            const pref = constant.NOTIFICATION_PREF_COLUMNS[type];
            await db.query(
                `INSERT INTO notification_recipients (notification_id, user_id)
                 SELECT ?, u.id FROM users u
                 ${pref ? "LEFT JOIN user_profiles p ON p.user_id = u.id" : ""}
                 WHERE u.is_deleted = 0 AND u.is_active = 1 AND u.status = 'active' AND u.signup_step = 'completed'
                 ${pref ? `AND COALESCE(p.${pref}, 1) = 1` : ""}
                 ${toEveryone ? "" : "AND u.id = ANY(?::bigint[])"}`,
                toEveryone ? [result.insertId] : [result.insertId, receiver_ids],
            );

            // 3. FCM push will be added here later, so every caller gets it automatically
        } catch (error) {
            console.error("sendNotification failed: ", error);
        }
    },

    // "New event" / "New notice" for everything posted or published since the last run (cron every minute, and
    // right after an executive saves). notified_at is set in the same UPDATE, so nothing is announced twice
    async notifyNewContent() {
        try {
            // "New event" notifications switched off in the settings: events are still marked, so nothing old is
            // announced later when they are switched back on
            const { event_notifications } = await common.getSettings();
            const [events] = await db.query(
                `UPDATE events SET notified_at = NOW()
                 WHERE status = 'posted' AND notified_at IS NULL AND is_deleted = 0 AND is_active = 1
                 RETURNING id, title, description, TO_CHAR(event_date, 'DD Mon YYYY') AS day, TO_CHAR(event_date + start_time, 'HH12:MI AM') AS time,
                    venue_name, venue_address, created_by, email_members`,
            );
            for (const e of events.rows) {
                if (event_notifications) {
                    await common.sendNotification({
                        sender_id: e.created_by,
                        receiver_ids: constant.NOTIFY_EVERYONE,
                        type: constant.NOTIFICATION_TYPE.EVENT,
                        title: e.title,
                        message: `${e.day} · ${e.venue_name}`,
                        ref_type: "event",
                        ref_id: e.id,
                    });
                }
                // Publish and Share (email): asked for by whoever posted it, so sent even with notifications off
                if (e.email_members) {
                    await common.emailMembers(constant.NOTIFY_EVERYONE, {
                        heading: "New Event",
                        title: e.title,
                        details: [["Date", e.day], ["Time", e.time], ["Venue", [e.venue_name, e.venue_address].filter(Boolean).join(", ")]],
                        body: e.description,
                    });
                }
            }

            const [notices] = await db.query(
                `UPDATE notices SET notified_at = NOW()
                 WHERE status = 'published' AND (published_at IS NULL OR published_at <= NOW())
                   AND notified_at IS NULL AND is_deleted = 0 AND is_active = 1
                 RETURNING id, title, body, audience, created_by, email_members`,
            );
            for (const n of notices.rows) {
                const [recipients] = n.audience === "all"
                    ? [[]]
                    : await db.query("SELECT user_id FROM notice_recipients WHERE notice_id = ?", [n.id]);
                const receiver_ids = n.audience === constant.NOTICE_AUDIENCE.ALL ? constant.NOTIFY_EVERYONE : recipients.map((r) => r.user_id);
                await common.sendNotification({
                    sender_id: n.created_by,
                    receiver_ids,
                    type: constant.NOTIFICATION_TYPE.NOTICE,
                    title: n.title,
                    message: n.body,
                    ref_type: "notice",
                    ref_id: n.id,
                });
                if (n.email_members) {
                    await common.emailMembers(receiver_ids, { heading: "Notice", title: n.title, body: n.body });
                }
            }
            return events.rows.length + notices.rows.length;
        } catch (error) {
            console.error("Error sending new content notifications: ", error);
            return 0;
        }
    },

    // "Publish and Share (email)": one event / notice mailed to its members (receiver_ids, or constant.NOTIFY_EVERYONE
    // for every active member who finished sign-up). Members go in Bcc, MAIL_BATCH_SIZE per mail, so nobody sees the
    // others' addresses. mail = { heading, title, details, body } (config/mail.js). Never throws
    async emailMembers(receiver_ids, mail) {
        try {
            const toEveryone = receiver_ids === constant.NOTIFY_EVERYONE;
            if (!toEveryone && !receiver_ids?.length) return;
            const sender = process.env.MAIL_FROM || process.env.SMTP_USER;
            if (!sender) return; // mail is not set up on this server

            const [rows] = await db.query(
                `SELECT DISTINCT email FROM users
                 WHERE is_deleted = 0 AND is_active = 1 AND status = 'active' AND signup_step = 'completed' AND email <> ''
                 ${toEveryone ? "" : "AND id = ANY(?::bigint[])"}`,
                toEveryone ? [] : [receiver_ids],
            );
            const { society_name } = await common.getSettings();
            const htmlMessage = createContentMailTemplate({ societyName: society_name, ...mail });
            const subject = `${mail.heading}: ${mail.title}`.slice(0, constant.TITLE_MAX_LENGTH);
            const emails = rows.map((r) => r.email);
            for (let i = 0; i < emails.length; i += constant.MAIL_BATCH_SIZE) {
                await common.sendOtpMail({ toEmail: sender, bccEmails: emails.slice(i, i + constant.MAIL_BATCH_SIZE), subject, htmlMessage });
            }
        } catch (error) {
            console.error("[emailMembers]", error.message);
        }
    },

    // Sends one email (OTP mails, and the members' Publish and Share mails with bccEmails).
    // With BREVO_API_KEY the mail goes through Brevo's HTTPS API, which works where email ports are blocked
    // (Render's free plan blocks 25 / 465 / 587). Without it, Gmail SMTP is used as before
    async sendOtpMail({ toEmail, subject, htmlMessage, bccEmails = [] }) {
        if (!toEmail || !subject || !htmlMessage) {
            return { skipped: true, reason: "Missing toEmail/subject/htmlMessage" };
        }

        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
        const mailFrom = process.env.MAIL_FROM || smtpUser;

        if (process.env.BREVO_API_KEY && mailFrom) {
            const response = await fetch(constant.BREVO_API_URL, {
                method: "POST",
                headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
                body: JSON.stringify({
                    sender: { email: mailFrom, name: process.env.APP_NAME || "Society App" },
                    to: [{ email: toEmail }],
                    ...(bccEmails.length ? { bcc: bccEmails.map((email) => ({ email })) } : {}),
                    subject,
                    htmlContent: htmlMessage,
                }),
                signal: AbortSignal.timeout(constant.MAIL_TIMEOUT_MS),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(`Brevo ${response.status}: ${data.message || "mail not sent"}`);
            }
            return { skipped: false, messageId: data.messageId };
        }

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
            connectionTimeout: constant.MAIL_TIMEOUT_MS,
            greetingTimeout: constant.MAIL_TIMEOUT_MS,
            socketTimeout: constant.MAIL_TIMEOUT_MS,
        });

        const info = await transporter.sendMail({
            from: mailFrom,
            to: toEmail,
            ...(bccEmails.length ? { bcc: bccEmails } : {}),
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
