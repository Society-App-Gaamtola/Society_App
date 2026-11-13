import localizify from "localizify";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
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
        // All roles (Super Admin included) live in users / user_devices
        const [devices] = await db.query(
            `SELECT id FROM user_devices
             WHERE user_id = ? AND refresh_token_hash = ? AND status = 'active' AND is_active = 1 AND is_deleted = 0 LIMIT 1`,
            [decoded.id, common.hashToken(bearerToken)]
        );
        if (!devices.length) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "You_Are_Not_Logged_In", null);
        }

        const account = await common.getUserDetails({ id: decoded.id });
        if (!account || common.isAccountInactive(account)) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "rest_keywords_unauthorized", null);
        }

        // Role is re-read from the DB so a promotion / demotion applies without re-login
        req.loginUser = {
            ...decoded,
            role: account.role,
        };
        return next();
    } catch (error) {
        console.error("Error in token verification: ", error);
        return sendApiResponse(res, Codes.INTERNAL_ERROR, Codes.RESPONSE_ERROR, "rest_keywords_error", null);
    }
}

// Usage: router.post("/event/add", middleware.allowedRoles("super_admin", "executive"), controller.addEvent)
// Must run after tokenMiddleware (i.e. not on a bypassed route)
const allowedRoles = (...roles) => {
    return (req, res, next) => {
        const role = req.loginUser?.role;
        if (!role) {
            return sendApiResponse(res, Codes.UNAUTHORIZED, Codes.INVALID_TOKEN, "rest_keywords_unauthorized", null);
        }

        if (!roles.includes(role)) {
            return sendApiResponse(res, Codes.FORBIDDEN, Codes.RESPONSE_ERROR, "rest_keywords_forbidden", null);
        }

        return next();
    };
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
    validateJoi,
    encryption,
    decryption,
    getBearerToken,
    tokenMiddleware,
    allowedRoles,
    checkApi,
};
