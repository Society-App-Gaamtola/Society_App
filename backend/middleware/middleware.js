import localizify from "localizify";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import Codes from "../config/status_codes.js";
import common from "../config/common.js";
import constant from "../config/constant.js";
import db from "../config/db.js";
import en from "../languages/en.js";
import hi from "../languages/hn.js";
import gu from "../languages/guj.js";

const { default: local, t } = localizify;

local
    .add("en", en)
    .add("hi", hi)
    .add("gu", gu);

const key = CryptoJS.enc.Utf8.parse(process.env.KEY || "");
const iv = CryptoJS.enc.Utf8.parse(process.env.IV || "");


const resolveMessage = (responseMessage) => {
    if (!responseMessage) {
        return { keyword: '', components: {} };
    }

    if (typeof responseMessage === 'string') {
        const entry = Object.entries(en).find(([, value]) => value === responseMessage);
        return { keyword: entry ? entry[0] : responseMessage, components: {} };
    }

    if (typeof responseMessage === 'object') {
        return {
            keyword: responseMessage.keyword || responseMessage.message || '',
            components: responseMessage.components || {},
        };
    }

    return { keyword: '', components: {} };
};

const extractHeaderLanguage = (req, res, next) => {
    const { LANGUAGES, DEFAULT_LANGUAGE } = constant;
    const headerLang = (req.headers['accept-language'] || DEFAULT_LANGUAGE).split(',')[0].split('-')[0].toLowerCase();
    req.lang = LANGUAGES.includes(headerLang) ? headerLang : DEFAULT_LANGUAGE;
    res.locals.language = req.lang;
    req.getTranslation = (keyword, components = {}) => {
        local.setLocale(req.lang);
        return t(keyword, components);
    };
    next();
};

const sendApiResponse = async (res, httpStatus = Codes.SUCCESS, resCode, msgKey, resData) => {
    const language = (res.locals && res.locals.language) || "en";
    local.setLocale(language);
    const { keyword, components } = resolveMessage(msgKey);

    const responsejson = {
        code: resCode,
        message: t(keyword, components),
    };

    if (resData != null) {
        responsejson.data = resData;
    }

    res.status(httpStatus);
    res.json(responsejson);
};

const sendSuccess = (res, msgKey, resData = null) => {
    return sendApiResponse(res, Codes.SUCCESS, Codes.RESPONSE_SUCCESS, msgKey, resData);
};

const sendError = (res, msgKey, resData = null) => {
    return sendApiResponse(res, Codes.SUCCESS, Codes.RESPONSE_ERROR, msgKey, resData);
};

// Logged in, but not allowed to do this (HTTP 403, code 0)
const sendForbidden = (res) => {
    return sendApiResponse(res, Codes.FORBIDDEN, Codes.RESPONSE_ERROR, "rest_keywords_forbidden", null);
};

const sendServerError = (res, where, error) => {
    // The OTP email couldn't be sent: tell the user that, not "An error occurred"
    if (error?.code === constant.OTP_MAIL_FAILED) {
        return sendApiResponse(res, Codes.SUCCESS, Codes.RESPONSE_ERROR, "rest_otp_mail_failed", null);
    }
    console.error(`Error in ${where}: `, error);
    return sendApiResponse(res, Codes.INTERNAL_ERROR, Codes.RESPONSE_ERROR, "rest_keywords_error", null);
};

// GET requests are checked from the query string. The checked values go on req.body either way,
// because Express 5 doesn't allow replacing req.query
const validateJoi = (schema, allowEmpty = false) => {
    return (req, res, next) => {
        const input = req.method === "GET" ? req.query : req.body;
        if (!allowEmpty && (!input || Object.keys(input).length === 0)) {
            return sendApiResponse(
                res,
                Codes.SUCCESS,
                Codes.MISSING_FIELD,
                "rest_keywords_required_fields_missing",
                null,
            );
        }

        const { error, value } = schema.validate(input || {}, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = {};
            error.details.forEach((err) => {
                const field = err.path && err.path.length ? err.path[0] : "field";
                errors[field] = err.message.replace(/"/g, "");
            });

            return sendApiResponse(
                res,
                Codes.SUCCESS,
                Codes.MISSING_FIELD,
                "rest_keywords_required_fields_missing",
                errors,
            );
        }

        req.body = value;
        return next();
    };
};

// AES (CBC, Pkcs7) with KEY / IV from .env — same scheme as enc_dec.html
const encryption = (data) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv }).toString();
};

// Plain JSON / multipart bodies pass through; only text/plain bodies are treated as encrypted
const decryption = (req, res, next) => {
    if (typeof req.body !== "string" || req.body.trim() === "") {
        return next();
    }

    try {
        const decrypted = CryptoJS.AES.decrypt(req.body.trim(), key, { iv }).toString(CryptoJS.enc.Utf8);
        req.body = JSON.parse(decrypted);
        return next();
    } catch (error) {
        return sendApiResponse(
            res,
            Codes.SUCCESS,
            Codes.RESPONSE_ERROR,
            "rest_invalid_request_payload",
            null,
        );
    }
};

const getBearerToken = (req) => {
    const token = req.headers['token'] || req.headers['authorization'] || "";
    return token.replace("Bearer ", "").trim();
};

async function tokenMiddleware(req, res, next) {
    const requestPath = (req.originalUrl || req.url || "").split("?")[0];
    if (constant.BYPASS_ROUTES.some((route) => requestPath.startsWith(route))) {
        return next();
    }

    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
        return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "rest_token_missing", null);
    }

    let decoded;
    try {
        decoded = jwt.verify(bearerToken, process.env.JWT_WEB_TOKEN);
    } catch (err) {
        const msgKey = err.name === "TokenExpiredError" ? "Token_expired_Please_login_again" : "Invalid_token";
        return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, msgKey, null);
    }

    try {
        // One query on every request: the session (this token on an active device; all roles, Super Admin included,
        // live in user_devices), the user's current status and role, and an executive's permission sections
        const [sessions] = await db.query(
            `SELECT d.role AS session_role, u.id AS user_id, u.is_active, u.status, r.code AS role,
                    CASE WHEN r.code = ? THEN ARRAY(
                        SELECT m.code FROM executive_permissions p JOIN modules m ON m.id = p.module_id
                        WHERE p.user_id = u.id AND p.is_active = 1 AND m.is_active = 1 AND m.is_deleted = 0
                    ) END AS sections
             FROM user_devices d
             LEFT JOIN users u ON u.id = d.user_id AND u.is_deleted = 0
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE d.user_id = ? AND d.refresh_token_hash = ? AND d.status = 'active' AND d.is_active = 1 AND d.is_deleted = 0
             LIMIT 1`,
            [constant.ROLES.EXECUTIVE, decoded.id, common.hashToken(bearerToken)]
        );
        const session = sessions[0];
        if (!session) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "You_Are_Not_Logged_In", null);
        }
        if (!session.user_id || common.isAccountInactive(session)) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "rest_keywords_unauthorized", null);
        }

        // The token was issued for one role (generateToken). It works only while the user still has that role:
        // after a promotion / demotion the user logs in again and gets a token for the new role
        if (session.session_role !== session.role || decoded.role !== session.role) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "rest_role_changed_login_again", null);
        }

        // allowedRoles (in each route) then checks this role, and requirePermission an executive's sections,
        // with no further query
        req.loginUser = { ...decoded, role: session.role };
        if (session.role === constant.ROLES.EXECUTIVE) {
            req.loginUser.permissions = { sections: session.sections };
        }
        return next();
    } catch (error) {
        console.error("Error in token verification: ", error);
        return sendApiResponse(res, Codes.INTERNAL_ERROR, Codes.RESPONSE_ERROR, "rest_keywords_error", null);
    }
}

// Usage: router.post("/event/add", middleware.allowedRoles("super_admin", "executive"), controller.addEvent)
// After allowedRoles, for executive actions on one panel section (constant.PERMISSION_SECTIONS):
//   router.post("/events", executives, middleware.requirePermission("events"), validateJoi(eventSchema), controller.createEvent)
// The Super Admin always passes; an executive needs the section (else HTTP 403). No query: tokenMiddleware loaded it
const requirePermission = (section) => {
    return (req, res, next) => (common.hasPermission(req.loginUser, section) ? next() : sendApiResponse(
        res, Codes.FORBIDDEN, Codes.RESPONSE_ERROR, "rest_permission_denied", null,
    ));
};

// Must run after tokenMiddleware (i.e. not on a bypassed route)
const allowedRoles = (...roles) => {
    return (req, res, next) => {
        const role = req.loginUser?.role;
        if (!role) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "rest_keywords_unauthorized", null);
        }

        if (!roles.includes(role)) {
            return sendForbidden(res);
        }

        return next();
    };
};

// The email or mobile number a public auth request is for (the body is already decrypted here)
const authIdentifier = (req) => {
    const { email, country_code = "", mobile_number = "" } = req.body || {};
    return String(email || `${country_code}${mobile_number}`).trim().toLowerCase();
};

// Refuses a request once its key has used up the rule (constant.RATE_LIMITS.X) in the time window.
// The counts live in this server's memory: no database query. perAccount = count per IP + email / mobile
// instead of per IP. Too many → HTTP 429, code 0, data { retry_after_seconds }
const rateLimiter = (rule, perAccount = false) => rateLimit({
    windowMs: rule.window_minutes * 60 * 1000,
    limit: rule.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => (perAccount ? `${ipKeyGenerator(req.ip)}|${authIdentifier(req)}` : ipKeyGenerator(req.ip)),
    handler: (req, res) => sendApiResponse(res, Codes.TOO_MANY_REQUESTS, Codes.RESPONSE_ERROR, "rest_too_many_requests", {
        retry_after_seconds: Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)),
    }),
});

// One instance each, shared by every route that uses it (so /auth/login and /admin/login count together).
// In a route, before validateJoi: router.post("/login", authLimits.ip, authLimits.login, validateJoi(...), ...)
const authLimits = {
    ip: rateLimiter(constant.RATE_LIMITS.AUTH_IP),
    login: rateLimiter(constant.RATE_LIMITS.LOGIN, true),
    otpSend: rateLimiter(constant.RATE_LIMITS.OTP_SEND, true),
    otpVerify: rateLimiter(constant.RATE_LIMITS.OTP_VERIFY, true),
};

const checkApi = (req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return sendApiResponse(
            res,
            Codes.UNAUTHORIZED,
            Codes.INVALID_APIKEY,
            "rest_keywords_unauthorized",
            null
        );
    }
    return next();
};

export default {
    resolveMessage,
    extractHeaderLanguage,
    sendApiResponse,
    sendSuccess,
    sendError,
    sendServerError,
    sendForbidden,
    validateJoi,
    encryption,
    decryption,
    getBearerToken,
    tokenMiddleware,
    allowedRoles,
    requirePermission,
    authLimits,
    checkApi,
};
