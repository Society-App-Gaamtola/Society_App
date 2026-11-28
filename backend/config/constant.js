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
    // Hosted PostgreSQL runs on UTC; "today's events" and dates like DATE(published_at) follow Indian time.
    // A zone name, not "+05:30": PostgreSQL reads "+05:30" with the POSIX sign, i.e. as UTC−5:30
    DB_TIME_ZONE: "Asia/Kolkata",
    // Connection pool. Each request takes a connection only while its query runs, so 20 serve many users at once.
    // A request that can't get a connection in DB_CONNECT_TIMEOUT_MS gets an error instead of waiting forever,
    // and a query running longer than DB_STATEMENT_TIMEOUT_MS is stopped so it can't hold a connection
    DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 20,
    DB_CONNECT_TIMEOUT_MS: 10000,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_STATEMENT_TIMEOUT_MS: 30000,
    // Render waits this long for open requests to finish on a redeploy / shutdown
    SHUTDOWN_TIMEOUT_MS: 10000,
    // PostgreSQL error codes the modules turn into friendly messages
    DB_ERROR: { UNIQUE_VIOLATION: "23505", FOREIGN_KEY_VIOLATION: "23503" },

    LANGUAGES: ["en", "hi", "gu"],
    DEFAULT_LANGUAGE: "en",

    // ---------- Content translations (config/translator.js, table content_translations) ----------
    // Text typed by people stays in its own table. Its Gujarati / Hindi copies, when stored in content_translations,
    // are returned to users of that language; otherwise the original is shown. No outside translation service
    TRANSLATABLE: {
        event: { table: "events", fields: ["title", "description", "venue_name", "venue_address"] },
        notice: { table: "notices", fields: ["title", "body"] },
    },
    TRANSLATION_LANGUAGES: ["gu", "hi"], // every app language except the stored one (DEFAULT_LANGUAGE)

    // Saved in declaration_acceptances when a user accepts the terms on the Profile & Address screen
    DECLARATION_VERSION: "1.0",

    // Routes that work without a login token
    BYPASS_ROUTES: [
        "/api/v1/auth/signup",
        "/api/v1/auth/login",
        "/api/v1/auth/send-otp",
        "/api/v1/auth/verify-otp",
        "/api/v1/auth/logout",
        "/api/v1/admin/login",
    ],

    // ---------- Rate limits (public auth routes; counted in the server's memory, never in the database) ----------
    // AUTH_IP: every login / sign-up / OTP request from one IP, all routes together (stops floods)
    // LOGIN, OTP_SEND, OTP_VERIFY: per IP + the email or mobile number the request is for, so one person can't
    // guess passwords / OTPs or fill a mailbox, while other users on the same network are not blocked
    // Too many → HTTP 429, code 0, rest_too_many_requests, data { retry_after_seconds }
    RATE_LIMITS: {
        AUTH_IP: { window_minutes: 15, max: 100 },
        LOGIN: { window_minutes: 15, max: 10 },     // POST /auth/login, /admin/login
        OTP_SEND: { window_minutes: 60, max: 5 },   // POST /auth/signup, /auth/send-otp (each sends an email)
        OTP_VERIFY: { window_minutes: 15, max: 10 }, // POST /auth/verify-otp
    },

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

    // ---------- Email ----------
    // Give up on a mail server after this long, so the app gets an answer instead of waiting minutes
    MAIL_TIMEOUT_MS: 10000,
    // Publish and Share (email): members are emailed in groups of this many (Bcc), one mail per group
    MAIL_BATCH_SIZE: 50,
    BREVO_API_URL: "https://api.brevo.com/v3/smtp/email",
    // Error code for "the OTP email could not be sent"; the app is told so instead of a general error
    OTP_MAIL_FAILED: "OTP_MAIL_FAILED",

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
    // user_devices.platform: from the device_type sent at login (the panel sends "web"); anything else → android
    DEVICE_PLATFORMS: ["android", "ios", "web"],
    // Takes a device off the account. Logging in again sets it back to active
    LOGGED_OUT_DEVICE: { refresh_token_hash: null, fcm_token: null, status: "logged_out", is_active: 0 },

    // ---------- Uploads ----------
    UPLOAD_DIR: "uploads",
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png"],
    MAX_IMAGE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB, as shown on the profile screen

    // ---------- Events / notices listing ----------
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
    // Dashboard / Financial Overview chart: a picked period this short (e.g. one month) is shown per day
    DAILY_CHART_MAX_DAYS: 31,
    SEARCH_MAX_LENGTH: 100,
    HOME_LIST_LIMIT: 5, // upcoming events and latest notices on the home page
    HOME_HERO_LIMIT: 5, // hero slider on the home page
    // Only posted events are shown to users. Events need no approval: post = live now, schedule = live at publish_at
    EVENT_STATUS: {
        DRAFT: "draft",
        SCHEDULED: "scheduled",
        POSTED: "posted",
        CANCELLED: "cancelled",
    },
    NOTICE_STATUS: { DRAFT: "draft", PUBLISHED: "published" },
    // Notice categories are edited in App Settings (DEFAULT_SETTINGS.notice_tags), stored lowercase
    NOTICE_TAG_MAX_LENGTH: 64,
    NOTICE_AUDIENCE: { ALL: "all", SELECTED: "selected" },
    MAX_NOTICE_RECIPIENTS: 500,

    // ---------- Events / notices / media: one URL per item for every role (/api/v1/user) ----------
    // Who may call an API is decided in the route with middleware.allowedRoles (see userRoute.js).
    // These roles create events / notices, and may send mine / status to GET /user/events and /user/notices
    CREATOR_ROLES: ["super_admin", "executive"],
    // These roles see and edit everyone's events / notices / gallery items; others only their own
    SEE_ALL_ROLES: ["super_admin"],
    // What the creator asks for when saving an event / notice
    EVENT_ACTIONS: { DRAFT: "draft", POST: "post", SCHEDULE: "schedule" },
    // Event Planning (future_event_plans): ideas for coming events, before one is created
    EVENT_PLAN_STATUS: { IDEA: "idea", PLANNING: "planning", APPROVED: "approved", DROPPED: "dropped", CONVERTED: "converted" },
    NOTICE_ACTIONS: { DRAFT: "draft", PUBLISH: "publish" },
    REVIEW_ACTIONS: { APPROVE: "approve", REJECT: "reject" },
    TITLE_MAX_LENGTH: 256,
    DESCRIPTION_MAX_LENGTH: 5000,
    VENUE_MAX_LENGTH: 256,
    ADDRESS_LINE_MAX_LENGTH: 512,
    ORGANIZER_MAX_LENGTH: 128,
    REASON_MAX_LENGTH: 256,
    // Images per event (event_images); the first one is the cover when no poster_url is sent
    EVENT_MAX_IMAGES: 10,
    // ---------- Media ----------
    // The app uploads photos and videos straight to Cloudinary and sends the link; the server only stores it.
    // Only links from the society's Cloudinary account are accepted
    MEDIA_URL_PREFIX: "https://res.cloudinary.com/ggrljuty/",
    MEDIA_URL_MAX_LENGTH: 512,
    // Every file must sit in its folder: society_app/<production|development>/<folder>/<file>.
    // {user} = the uploader's id, {yyyy}/{mm} = upload year and month. The app builds the same paths
    MEDIA_ROOT_FOLDER: "society_app",
    MEDIA_FOLDERS: {
        profile: "profiles/user_{user}",
        gallery: "gallery/{yyyy}/{mm}",
        event: "events/{yyyy}/{mm}", // event posters / banners
        proof: "proofs/user_{user}", // payment proof for the Executive Request (image or PDF)
        finance: "finance/{yyyy}/{mm}", // donation proofs and expense bills uploaded in the panel
        branding: "branding", // the society logo, UPI QR code
    },
    MEDIA_STATUS: { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" },
    // Photos from these roles are published straight away; members' photos wait for approval
    MEDIA_AUTO_APPROVE_ROLES: ["super_admin", "executive"],
    CAPTION_MAX_LENGTH: 256,

    // ---------- Donations ----------
    // gateway = card / net banking: not offered (the app pays by UPI or cash only); kept for the column's old values
    DONATION_METHODS: { GATEWAY: "gateway", UPI_APP: "upi_app", UPI_QR: "upi_qr", CASH: "cash", BANK: "bank", CHEQUE: "cheque" },
    // What the panel can enter (UPI done outside the app = upi_app)
    ADMIN_DONATION_METHODS: ["upi_app", "upi_qr", "cash", "bank", "cheque"],
    MEMBER_DONATION_METHODS: ["upi_app", "upi_qr", "cash"],
    // Paid outside the app and confirmed with the 12-digit UPI transaction ID (UTR)
    UPI_METHODS: ["upi_app", "upi_qr"],
    // A member's UPI donation is saved (pending, no UTR) before they pay, so its receipt number (DON042) can go in the
    // UPI note and show on the bank statement. The UTR comes after paying. One still without a UTR after this many
    // hours was never paid: the cron job removes it (DONATION_CLEANUP_SCHEDULE, daily at 1:30 AM)
    DONATION_UNPAID_KEEP_HOURS: 48,
    DONATION_CLEANUP_SCHEDULE: "30 1 * * *",
    // success = verified by the treasurer / Super Admin; rejected = not received (entered by mistake, wrong UTR…)
    DONATION_STATUS: { PENDING: "pending", SUCCESS: "success", FAILED: "failed", CANCELLED: "cancelled", REJECTED: "rejected" },
    // The statuses the panel sets
    DONATION_REVIEW_STATUSES: ["pending", "success", "rejected"],
    DONATION_MIN_AMOUNT: 1,
    DONATION_MAX_AMOUNT: 1000000,
    EXEC_APPLICATION_STATUS: { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected", SUSPENDED: "suspended" },
    EXEC_REASON_MAX_LENGTH: 1000,
    // Roles the Super Admin can give in the app / panel. Nobody can be made Super Admin through the API
    ASSIGNABLE_ROLES: ["member", "executive"],

    // ---------- Recent Activities (the panel dashboard) ----------
    // There is no activity log table: the dashboard reads the newest rows of these tables (adminModule.recentActivities).
    // The text is the language key activity_<code>
    ACTIVITY: {
        EVENT_CREATED: "event_created",
        NOTICE_CREATED: "notice_created",
        MEMBER_JOINED: "member_joined",
        MEDIA_UPLOADED: "media_uploaded",
        EXECUTIVE_REQUEST_SENT: "executive_request_sent",
        DONATION_RECORDED: "donation_recorded",
        EXPENSE_CREATED: "expense_created",
    },
    ACTIVITY_DASHBOARD_LIMIT: 6,

    // ---------- Executive permissions (table executive_permissions, one row per allowed section) ----------
    // The panel sections an executive can be given (modules.code). Checked with middleware.requirePermission(section)
    // after allowedRoles: the Super Admin always passes, an executive needs the section. Enforced today on events,
    // notices and media; the others are saved for their APIs (donations, expenses, reports, settings)
    PERMISSION_SECTIONS: ["events", "notices", "donations", "expenses", "reports", "media", "settings"],
    // What a new executive gets
    DEFAULT_EXECUTIVE_SECTIONS: ["events", "notices"],

    // ---------- Member codes (users.member_code) ----------
    // Given automatically when sign-up is completed: prefix + the next number of member_code_seq, e.g. GM0001.
    // The Super Admin gets none. The Super Admin may still change a code by hand (it must stay unique)
    MEMBER_CODE_PREFIX: "GM",
    MEMBER_CODE_DIGITS: 4,

    // Record numbers the panel / app show for a row id (DON001, EXP012): never stored, but the admin search matches
    // them (lib/utils.ts recordNo, mobile receipt.ts receiptNo use the same prefix and digits)
    RECORD_NO_PREFIX: { DONATION: "DON", EXPENSE: "EXP" },
    RECORD_NO_DIGITS: 3,

    // ---------- Admin: members ----------
    // users.status: suspended = deactivated by the Super Admin (logged out on the next request)
    USER_STATUS: { ACTIVE: "active", SUSPENDED: "suspended" },
    // users.signup_step values the members filter accepts: completed, or "pending" = not finished yet
    MEMBER_SIGNUP_FILTER: { COMPLETED: "completed", PENDING: "pending" },
    MEMBER_SORT_FIELDS: ["name", "joined", "member_code"],
    MEMBER_CODE_MAX_LENGTH: 32,
    // How many recent donations the member detail shows
    MEMBER_RECENT_DONATIONS: 5,

    // ---------- Cash book (society_transactions) ----------
    TRANSACTION_TYPE: { RECEIVED: "received", PAID: "paid" },
    // Expenses = "paid" rows. Only verified ones count in totals, the dashboard and reports
    EXPENSE_STATUS: { PENDING: "pending", VERIFIED: "verified", REJECTED: "rejected" },
    EXPENSE_MODES: ["cash", "upi", "bank", "cheque"],
    // The payment modes the panel filters and reports by; a donation's UPI covers the app's two UPI methods
    PAYMENT_MODES: ["upi", "cash", "bank", "cheque"],
    DEFAULT_CATEGORY_COLOR: "#7A1020", // a new event category added in the Settings screen
    DONATION_METHODS_BY_MODE: { upi: ["upi_app", "upi_qr"], cash: ["cash"], bank: ["bank"], cheque: ["cheque"] },
    AMOUNT_MAX: 10000000,
    EXPENSE_SORT_FIELDS: ["date", "amount"],
    DONATION_SORT_FIELDS: ["date", "amount"],

    // ---------- Financial reports ----------
    REPORT_TYPES: ["summary", "donation", "expense", "category", "monthly", "custom"],
    // Latest transactions on the Financial Overview
    FINANCE_RECENT_LIMIT: 5,

    // ---------- App settings (table app_settings: key → JSON value; common.getSettings, cached) ----------
    // The values used until the Super Admin saves something else. Lists are edited in the panel
    DEFAULT_SETTINGS: {
        society_name: "Shri Gamtola Yuvak Mitra Mandal",
        // The name in Gujarati script, shown above the English one (app header, splash, panel). A setting, not a
        // translation row: there is one society name, edited in App Settings
        society_name_gu: "શ્રી ગામટોળા યુવક મિત્ર મંડળ",
        contact_email: "",
        phone: "",
        address: "",
        // The society's Google Maps link: the default location in shared events that have no pin / map link of their own
        map_link: "",
        logo_url: null,
        show_gujarati_name: true,
        executive_min_donation: 10000,
        allow_registration: true, // sign-up open in the app
        allow_uploads: true, // members may upload photos / videos
        require_media_approval: true, // members' uploads wait for approval
        event_notifications: true, // "new event" notifications to members
        notify_new_member: true, // alerts to the Super Admin (in-app notifications)
        notify_donation: true,
        notify_executive_request: true,
        notify_media_upload: true,
        notify_expense: true, // an executive's expense waiting for verification
        donation_purposes: [
            "Garba", "Sandhya Aarti", "Prasad Vitaran", "Volunteer Activities", "Other Society Events", "Batuk Bhojan",
            "Garba Prasad", "Aarti Prasad", "Prasad Distribution", "Festival", "Aarti", "Cultural", "General Fund", "Other",
        ],
        expense_categories: [
            "Garba", "Sandhya Aarti", "Prasad Vitaran", "Volunteer Activities", "Other Society Events", "Batuk Bhojan",
            "Decoration", "Food", "Sound & Light", "Printing", "Maintenance", "Other",
        ],
        // Notice categories (notices.tag), lowercase. important / general / event have their own look in the app
        notice_tags: ["important", "general", "event"],
        // Society pages, opened from the app (App Settings → Social Networking). Empty = not shown
        social_links: { facebook: "", instagram: "", x: "", youtube: "" },
        // Set by GET /admin/backup (not editable through PUT /admin/settings)
        last_backup_at: null,
    },
    // The keys of social_links, in the order the app shows them
    SOCIAL_NETWORKS: ["facebook", "instagram", "x", "youtube"],
    SOCIAL_LINK_MAX_LENGTH: 256,
    SETTING_TEXT_MAX_LENGTH: 256,
    SETTING_LIST_MAX_ITEMS: 50,

    // ---------- Member directory ----------
    DIRECTORY_ROLES: ["super_admin", "executive", "member"],
    // These roles see every member's mobile and email; others only what members chose to show
    CONTACT_VISIBLE_ROLES: ["super_admin", "executive"],

    // ---------- Notifications (in-app list; push via FCM comes later) ----------
    NOTIFICATION_TYPE: { EVENT: "event", NOTICE: "notice", DONATION: "donation", GENERAL: "general" },
    NOTIFICATION_PRIORITY: { NORMAL: "normal", HIGH: "high" },
    // receiver_ids value for common.sendNotification: every active member who finished sign-up
    NOTIFY_EVERYONE: "all",
    NOTIFICATION_BODY_MAX_LENGTH: 512,
    // The app's Settings → Notifications switches: notification type → user_profiles column. A type not listed
    // (general: role changes, admin alerts) is always delivered
    NOTIFICATION_PREF_COLUMNS: { event: "notify_events", notice: "notify_notices", donation: "notify_payments" },

    // ---------- Cron jobs (node-cron syntax) ----------
    // Every day at midnight
    OTP_CLEANUP_SCHEDULE: "0 0 * * *",
    // Every day at midnight (and once when the server starts): scheduled events whose publish time has passed are
    // posted, and members are notified about events / notices that went live since the last run. Items posted or
    // published right away are announced at once when saved, not by this job
    EVENT_PUBLISH_SCHEDULE: "0 0 * * *",
    // Every day at 1 AM (and once when the server starts): each user's copy of a notification they read more than
    // NOTIFICATION_READ_KEEP_DAYS ago is deleted, then every notification nobody has a copy of any more. Unread ones stay
    NOTIFICATION_CLEANUP_SCHEDULE: "0 1 * * *",
    NOTIFICATION_READ_KEEP_DAYS: 30,
};
