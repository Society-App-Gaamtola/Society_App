// App-wide settings. Secrets and per-machine values (DB, SMTP, JWT, API key) stay in .env
export default {
    PORT: process.env.PORT || 5020,
    ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || "http://localhost:3000",
    IMAGE_BASE_URL: `${process.env.BASE_URL || "http://localhost:5020"}/uploads/`,

    // Values stored in the JWT `role` claim, matching roles.code (users.role_id → roles.id)
    ROLES: {
        SUPER_ADMIN: "super_admin",
        EXECUTIVE: "executive",
        MEMBER: "member",
    },

    // ---------- Database session ----------
    // Hosted MySQL runs on UTC; dates like "today's events" and stored times are Indian time
    DB_TIME_ZONE: "+05:30",
    // The same rules locally (XAMPP) and on the host (Aiven defaults to strict ANSI mode)
    DB_SQL_MODE: "STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION",

    LANGUAGES: ["en", "hi", "gu"],
    DEFAULT_LANGUAGE: "en",

    // Saved in declaration_acceptances when a user accepts the terms on the Profile & Address screen
    DECLARATION_VERSION: "1.0",

    // Routes that work without a login token
    BYPASS_ROUTES: [
        "/api/v1/auth/signup",
        "/api/v1/auth/login",
        "/api/v1/auth/send-otp",
        "/api/v1/auth/verify-otp",
        "/api/v1/auth/logout",
    ],

    // ---------- Auth ----------
    TOKEN_EXPIRY_DAYS: 365,
    BCRYPT_ROUNDS: 10,
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_MAX_LENGTH: 64,
    USERNAME_MIN_LENGTH: 2,
    USERNAME_MAX_LENGTH: 100,
    ADDRESS_MAX_LENGTH: 256,
    DEFAULT_COUNTRY_CODE: "+91",

    // users.signup_step → the `steps` number the app receives
    SIGNUP_STEPS: { otp_pending: 0, profile_pending: 1, completed: 2 },

    // ---------- OTP ----------
    OTP_EXPIRY_MINUTES: 5,
    OTP_RESEND_SECONDS: 60, // matches the resend timer on the OTP screen
    MAX_OTP_ATTEMPTS: 5,
    // Outside production every OTP is this, so the flow can be tested without a real mailbox
    DEV_OTP: "123456",
    OTP_PURPOSE: {
        SIGNUP: "signup",
        LOGIN: "login",
        EMAIL_CHANGE: "email_change",
    },

    // ---------- Devices ----------
    DEVICE_STATUS: { ACTIVE: "active", BLOCKED: "blocked", LOGGED_OUT: "logged_out" },
    // Takes a device off the account. Logging in again sets it back to active
    LOGGED_OUT_DEVICE: { refresh_token_hash: null, fcm_token: null, status: "logged_out", is_active: 0 },

    // ---------- Uploads ----------
    UPLOAD_DIR: "uploads",
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png"],
    MAX_IMAGE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB, as shown on the profile screen

    // ---------- Events / notices listing ----------
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
    SEARCH_MAX_LENGTH: 100,
    HOME_LIST_LIMIT: 5, // upcoming events and latest notices on the home page
    HOME_HERO_LIMIT: 5, // hero slider on the home page
    EVENT_STATUS: { POSTED: "posted" }, // only posted events are shown to users
    NOTICE_STATUS: { PUBLISHED: "published" },
    NOTICE_TAGS: ["important", "general", "event"],
    // ---------- Cron jobs (node-cron syntax) ----------
    // Every day at midnight
    OTP_CLEANUP_SCHEDULE: "0 0 * * *",
};
