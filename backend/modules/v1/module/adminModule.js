import bcrypt from "bcryptjs";
import db from "../../../config/db.js";
import query from "../../../config/dbHelper.js";
import constant from "../../../config/constant.js";
import common from "../../../config/common.js";
import middleware from "../../../middleware/middleware.js";

// Admin panel APIs (/api/v1/admin). Who may call each one is checked in adminRoute.js
const {
    ROLES, DONATION_STATUS, EVENT_STATUS, NOTICE_STATUS, MEDIA_STATUS, EXEC_APPLICATION_STATUS, TRANSACTION_TYPE,
    USER_STATUS, MEMBER_SIGNUP_FILTER, DB_ERROR, ACTIVITY, EXPENSE_STATUS,
} = constant;
const { routeId } = common;

// Sort choices of the members list → SQL. Only these columns can be used (never text from the request)
const MEMBER_SORT_SQL = { name: "u.full_name", joined: "u.created_at", member_code: "u.member_code" };

// ---------- Finance helpers ----------

// Columns that go with a donation status: verified → confirmed now by this admin; rejected → by this admin; pending → none
const donationStatusColumns = (status, admin_id) => {
    if (status === DONATION_STATUS.SUCCESS) return { confirmed_at: new Date(), verified_by: admin_id };
    if (status === DONATION_STATUS.REJECTED) return { confirmed_at: null, verified_by: admin_id };
    return { confirmed_at: null, verified_by: null };
};

// Tells a member donor that their donation was verified or rejected (not awaited, never throws)
const tellDonor = async (id, status, admin_id) => {
    if (status !== DONATION_STATUS.SUCCESS && status !== DONATION_STATUS.REJECTED) return;
    try {
        const [[d]] = await db.query("SELECT donor_user_id, amount, purpose FROM donations WHERE id = ?", [id]);
        if (!d?.donor_user_id) return;
        await common.sendNotification({
            sender_id: admin_id,
            receiver_ids: [d.donor_user_id],
            type: constant.NOTIFICATION_TYPE.DONATION,
            title: status === DONATION_STATUS.SUCCESS ? "notify_donation_verified" : "notify_donation_rejected",
            message: `₹${Number(d.amount).toLocaleString("en-IN")}${d.purpose ? ` · ${d.purpose}` : ""}`,
            ref_type: "donation",
            ref_id: id,
        });
    } catch (error) {
        console.error("[tellDonor]", error.message);
    }
};

// Donations and expenses as one list (FROM … x), for the reports and the overview. filters: { from_date, to_date, category, mode }
const transactionsUnion = (filters) => {
    const d = ["d.is_deleted = 0"];
    const t = ["t.is_deleted = 0", `t.entry_type = '${TRANSACTION_TYPE.PAID}'`];
    const dParams = [];
    const tParams = [];
    if (filters.from_date) {
        d.push("d.donated_on >= CAST(? AS date)"); dParams.push(filters.from_date);
        t.push("t.txn_date >= CAST(? AS date)"); tParams.push(filters.from_date);
    }
    if (filters.to_date) {
        d.push("d.donated_on <= CAST(? AS date)"); dParams.push(filters.to_date);
        t.push("t.txn_date <= CAST(? AS date)"); tParams.push(filters.to_date);
    }
    if (filters.category) {
        d.push("d.purpose = ?"); dParams.push(filters.category);
        t.push("t.category = ?"); tParams.push(filters.category);
    }
    if (filters.mode) {
        d.push("d.method = ANY(?::text[])"); dParams.push(constant.DONATION_METHODS_BY_MODE[filters.mode]);
        t.push("t.mode = ?"); tParams.push(filters.mode);
    }
    return {
        union: `FROM (
                SELECT 'donation' AS kind, d.id, d.donated_on AS day, COALESCE(du.full_name, d.donor_name) AS description,
                    d.purpose AS category, d.method AS mode, d.amount, d.status, d.created_at
                FROM donations d LEFT JOIN users du ON du.id = d.donor_user_id WHERE ${d.join(" AND ")}
                UNION ALL
                SELECT 'expense', t.id, t.txn_date, t.description, t.category, t.mode, t.amount, t.status, t.created_at
                FROM society_transactions t WHERE ${t.join(" AND ")}
             ) x`,
        params: [...dParams, ...tParams],
    };
};

// Event categories from the Settings screen: [{ id?, name }]. Kept ids stay, others are hidden (is_active = 0, so
// their events keep them); items without an id are added with a code made from the name
const syncEventCategories = async (items, tx) => {
    const keepIds = items.filter((c) => c.id).map((c) => c.id);
    await tx.query(
        "UPDATE event_categories SET is_active = CASE WHEN id = ANY(?::bigint[]) THEN 1 ELSE 0 END WHERE is_deleted = 0",
        [keepIds],
    );
    const [[{ next }]] = await tx.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM event_categories");
    let order = next;
    for (const { name } of items.filter((c) => !c.id)) {
        const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "category";
        const [taken] = await tx.query("SELECT code FROM event_categories WHERE code LIKE ?", [`${base}%`]);
        const code = taken.some((r) => r.code === base) ? `${base}_${taken.length + 1}` : base;
        await query.insertQuery("event_categories", { code, name, color: constant.DEFAULT_CATEGORY_COLOR, sort_order: order++ }, "", tx);
    }
};

// The society's UPI details for the members' Donate screen: one active row (null switches it off)
const saveUpi = async (upi, admin_id, tx) => {
    if (upi === null) {
        await tx.query("UPDATE upi_settings SET is_active = 0 WHERE is_active = 1 AND is_deleted = 0");
        return;
    }
    const data = { payee_name: upi.payee_name, upi_id: upi.upi_id, qr_image_url: upi.qr_image_url || null, display_note: upi.display_note || null };
    const [rows] = await tx.query("SELECT id FROM upi_settings WHERE is_active = 1 AND is_deleted = 0 ORDER BY id DESC LIMIT 1");
    if (rows[0]) await query.updateQuery("upi_settings", data, "id = ?", [rows[0].id], tx);
    else await query.insertQuery("upi_settings", { ...data, created_by: admin_id }, "", tx);
};

// The dashboard's Recent Activities. There is no activity log table: this reads the newest rows of the main tables.
// Each part takes its own newest `limit` rows, then the whole list is cut to `limit`, newest first.
// target = what it was about (title, member, amount); actor = who did it (null for a member added by the Super Admin)
const recentActivities = async (limit, lang) => {
    const A = ACTIVITY;
    const [rows] = await db.query(
        `SELECT x.action, x.record_id, x.target, x.created_at, COALESCE(actor.full_name, actor.email) AS actor_name
         FROM (
            (SELECT '${A.EVENT_CREATED}' AS action, e.id AS record_id, e.title::text AS target, e.created_by AS actor_id, e.created_at
             FROM events e WHERE e.is_deleted = 0 ORDER BY e.created_at DESC LIMIT ?)
            UNION ALL
            (SELECT '${A.NOTICE_CREATED}', n.id, n.title, n.created_by, n.created_at
             FROM notices n WHERE n.is_deleted = 0 ORDER BY n.created_at DESC LIMIT ?)
            UNION ALL
            (SELECT '${A.MEMBER_JOINED}', u.id, COALESCE(u.full_name, u.email), NULL::bigint, u.created_at
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.is_deleted = 0 AND u.signup_step = 'completed' AND r.code <> '${ROLES.SUPER_ADMIN}'
             ORDER BY u.created_at DESC LIMIT ?)
            UNION ALL
            (SELECT '${A.MEDIA_UPLOADED}', m.id, NULLIF(m.caption, ''), m.uploaded_by, m.created_at
             FROM media_items m WHERE m.is_deleted = 0 ORDER BY m.created_at DESC LIMIT ?)
            UNION ALL
            (SELECT '${A.EXECUTIVE_REQUEST_SENT}', a.id, NULL::text, a.user_id, a.created_at
             FROM executive_applications a WHERE a.is_deleted = 0 ORDER BY a.created_at DESC LIMIT ?)
            UNION ALL
            (SELECT '${A.DONATION_RECORDED}', d.id, d.amount::text, COALESCE(d.entered_by, d.donor_user_id), d.created_at
             FROM donations d WHERE d.is_deleted = 0 ORDER BY d.created_at DESC LIMIT ?)
            UNION ALL
            (SELECT '${A.EXPENSE_CREATED}', t.id, t.description, t.entered_by, t.created_at
             FROM society_transactions t WHERE t.is_deleted = 0 AND t.entry_type = '${TRANSACTION_TYPE.PAID}'
             ORDER BY t.created_at DESC LIMIT ?)
         ) x
         LEFT JOIN users actor ON actor.id = x.actor_id
         ORDER BY x.created_at DESC
         LIMIT ?`,
        Array(8).fill(limit),
    );
    return rows.map((row) => ({
        id: `${row.action}-${row.record_id}`,
        action: row.action,
        text: common.translate(lang, `activity_${row.action}`, row.action),
        target: row.action === A.DONATION_RECORDED ? `₹${Number(row.target).toLocaleString("en-IN")}` : row.target,
        actor_name: row.actor_name,
        record_id: row.record_id,
        created_at: row.created_at,
    }));
};

// A database row → the member the panel gets
const toMember = (m) => ({
    id: m.id,
    member_code: m.member_code,
    name: m.full_name,
    email: m.email,
    country_code: m.country_code,
    mobile: m.mobile,
    role: m.role,
    status: m.status,
    signup: m.signup_step,
    is_verified: m.email_verified_at ? 1 : 0,
    address: m.address,
    photo_url: common.mediaUrl(m.photo_url),
    joined_on: m.created_at,
    last_login_at: m.last_login_at,
});

// The member the Super Admin wants to change: { member } or { errorKey }. A Super Admin can't be changed here
const findChangeableMember = async (id) => {
    const [rows] = id
        ? await db.query(
            "SELECT u.id, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.is_deleted = 0",
            [id],
        )
        : [[]];
    if (!rows[0]) return { errorKey: "rest_member_not_found" };
    if (rows[0].role === ROLES.SUPER_ADMIN) return { errorKey: "rest_super_admin_protected" };
    return { member: rows[0] };
};

// Unique email / mobile / member code taken by someone else → the message to show
const UNIQUE_MESSAGES = {
    uq_users_email: "rest_email_already_exists",
    uq_users_mobile: "rest_mobile_used_by_other",
    uq_users_member_code: "rest_member_code_already_exists",
};

// NUMERIC amounts come back from PostgreSQL as text
const money = (value) => Number(value ?? 0);

// The day a donation counts on (donations.donated_on: the day it was given, set in the app or the panel)
const DONATION_DAY = "d.donated_on";
// Only verified expenses count in totals, the chart and reports (cash-book "paid" rows)
const VERIFIED_EXPENSE = `t.status = '${constant.EXPENSE_STATUS.VERIFIED}'`;

// Confirmed donations and cash-book expenses between two days. A missing day means "no limit on that side"
const moneyTotals = async (from_date = null, to_date = null) => {
    const [[row]] = await db.query(
        `WITH r AS (SELECT CAST(? AS date) AS from_day, CAST(? AS date) AS to_day)
         SELECT
            (SELECT COALESCE(SUM(d.amount), 0) FROM donations d, r
             WHERE d.is_deleted = 0 AND d.status = ?
               AND (r.from_day IS NULL OR ${DONATION_DAY} >= r.from_day)
               AND (r.to_day IS NULL OR ${DONATION_DAY} <= r.to_day)) AS donations,
            (SELECT COUNT(*) FROM donations d, r
             WHERE d.is_deleted = 0 AND d.status = ?
               AND (r.from_day IS NULL OR ${DONATION_DAY} >= r.from_day)
               AND (r.to_day IS NULL OR ${DONATION_DAY} <= r.to_day)) AS donation_count,
            (SELECT COALESCE(SUM(t.amount), 0) FROM society_transactions t, r
             WHERE t.is_deleted = 0 AND t.is_active = 1 AND ${VERIFIED_EXPENSE} AND t.entry_type = ?
               AND (r.from_day IS NULL OR t.txn_date >= r.from_day)
               AND (r.to_day IS NULL OR t.txn_date <= r.to_day)) AS expenses,
            (SELECT COUNT(*) FROM society_transactions t, r
             WHERE t.is_deleted = 0 AND t.is_active = 1 AND ${VERIFIED_EXPENSE} AND t.entry_type = ?
               AND (r.from_day IS NULL OR t.txn_date >= r.from_day)
               AND (r.to_day IS NULL OR t.txn_date <= r.to_day)) AS expense_count`,
        [from_date, to_date, DONATION_STATUS.SUCCESS, DONATION_STATUS.SUCCESS, TRANSACTION_TYPE.PAID, TRANSACTION_TYPE.PAID],
    );
    return {
        donations: money(row.donations),
        expenses: money(row.expenses),
        transactions: row.donation_count + row.expense_count,
    };
};

// A picked period of up to DAILY_CHART_MAX_DAYS (e.g. one month) is charted per day, anything longer per month
const chartUnit = (from_date, to_date) => {
    if (!from_date || !to_date) return "month";
    const days = Math.round((Date.parse(to_date) - Date.parse(from_date)) / (24 * 60 * 60 * 1000)) + 1;
    return days <= constant.DAILY_CHART_MAX_DAYS ? "day" : "month";
};

// Donations vs expenses per month of the period (verified only), one row per month and only those months; per day
// (month = 'YYYY-MM-DD') when the period is short (chartUnit). Without from_date it starts at the first donation /
// expense; without to_date it runs to this month. Each row only counts the days inside the period.
// Shared by the dashboard chart and the Financial Overview
const monthlyTotals = async (from_date = null, to_date = null) => {
    // unit comes from code ("day" | "month"), never from the request
    const unit = chartUnit(from_date, to_date);
    const label = unit === "day" ? "YYYY-MM-DD" : "YYYY-MM";
    const [rows] = await db.query(
        `WITH r AS (SELECT CAST(? AS date) AS from_day, CAST(? AS date) AS to_day),
         bounds AS (
            SELECT DATE_TRUNC('${unit}', COALESCE(r.from_day, LEAST(
                        (SELECT MIN(${DONATION_DAY}) FROM donations d WHERE d.is_deleted = 0 AND d.status = ?),
                        (SELECT MIN(t.txn_date) FROM society_transactions t
                         WHERE t.is_deleted = 0 AND t.is_active = 1 AND ${VERIFIED_EXPENSE} AND t.entry_type = ?)
                    ), CURRENT_DATE)) AS first_month,
                   DATE_TRUNC('${unit}', COALESCE(r.to_day, CURRENT_DATE)) AS last_month
            FROM r
         )
         SELECT TO_CHAR(m.month, '${label}') AS month,
            (SELECT COALESCE(SUM(d.amount), 0) FROM donations d
             WHERE d.is_deleted = 0 AND d.status = ?
               AND DATE_TRUNC('${unit}', ${DONATION_DAY}) = m.month
               AND (r.from_day IS NULL OR ${DONATION_DAY} >= r.from_day)
               AND (r.to_day IS NULL OR ${DONATION_DAY} <= r.to_day)) AS donations,
            (SELECT COALESCE(SUM(t.amount), 0) FROM society_transactions t
             WHERE t.is_deleted = 0 AND t.is_active = 1 AND ${VERIFIED_EXPENSE} AND t.entry_type = ?
               AND DATE_TRUNC('${unit}', t.txn_date) = m.month
               AND (r.from_day IS NULL OR t.txn_date >= r.from_day)
               AND (r.to_day IS NULL OR t.txn_date <= r.to_day)) AS expenses
         FROM r, bounds,
              GENERATE_SERIES(bounds.first_month, GREATEST(bounds.first_month, bounds.last_month), INTERVAL '1 ${unit}') AS m(month)
         ORDER BY m.month`,
        [from_date ?? null, to_date ?? null, DONATION_STATUS.SUCCESS, TRANSACTION_TYPE.PAID, DONATION_STATUS.SUCCESS, TRANSACTION_TYPE.PAID],
    );
    return rows;
};

// The period of the same length just before from_date..to_date (both 'YYYY-MM-DD')
const previousPeriod = (from_date, to_date) => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const from = Date.parse(from_date);
    const days = Math.round((Date.parse(to_date) - from) / DAY_MS) + 1;
    const toDay = (ms) => new Date(ms).toISOString().slice(0, 10);
    return { from_date: toDay(from - days * DAY_MS), to_date: toDay(from - DAY_MS) };
};

// Percent change, one decimal. null when there is nothing to compare with
const trend = (now, before) => (before ? Math.round(((now - before) / before) * 1000) / 10 : null);

const adminModule = {
    // Admin panel login with email + password. Only the Super Admin gets a token.
    // The token works like the app's, so the panel can also call the shared /user and /executive APIs
    async login(request, res) {
        try {
            const { email, password } = request.body;
            const user = await common.getUserDetails({ email });

            if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
                return middleware.sendError(res, "rest_invalid_login_credentials");
            }
            if (user.role !== ROLES.SUPER_ADMIN) {
                return middleware.sendError(res, "rest_admin_only");
            }
            if (common.isAccountInactive(user)) {
                return middleware.sendError(res, "rest_account_inactive");
            }

            // A token for the Super Admin role (saved in user_devices with the role and device details)
            const token = await common.generateToken(user, request, ROLES.SUPER_ADMIN);
            return middleware.sendSuccess(res, "rest_login_successful", { userData: common.sanitizeUser(user), token });
        } catch (error) {
            return middleware.sendServerError(res, "adminLogin", error);
        }
    },

    // Everything the dashboard shows, in 3 queries run together:
    //   1. counts (members, events, notices) and pending items waiting for the Super Admin
    //   2. money in the picked range (+ the previous period of the same length, for the trend)
    //   3. donations vs expenses for each month of the picked period (the chart)
    async getDashboard(request, res) {
        try {
            const { from_date, to_date } = request.body;
            const hasRange = Boolean(from_date && to_date);
            const before = hasRange ? previousPeriod(from_date, to_date) : null;

            const [[[c]], current, previous, months, recent] = await Promise.all([
                db.query(
                    `SELECT
                        (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
                         WHERE u.is_deleted = 0 AND u.is_active = 1 AND u.status = 'active' AND u.signup_step = 'completed'
                           AND r.code <> ?) AS total_members,
                        (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
                         WHERE u.is_deleted = 0 AND u.is_active = 1 AND u.status = 'active' AND u.signup_step = 'completed'
                           AND r.code = ?) AS executives,
                        (SELECT COUNT(*) FROM events e
                         WHERE e.is_deleted = 0 AND e.is_active = 1 AND e.status = ?
                           AND COALESCE(e.end_date, e.event_date) >= CURRENT_DATE) AS active_events,
                        (SELECT COUNT(*) FROM notices n
                         WHERE n.is_deleted = 0 AND n.is_active = 1 AND n.status = ?) AS total_notices,
                        (SELECT COUNT(*) FROM donations d WHERE d.is_deleted = 0 AND d.status = ?) AS pending_donations,
                        (SELECT COUNT(*) FROM society_transactions t
                         WHERE t.is_deleted = 0 AND t.entry_type = '${TRANSACTION_TYPE.PAID}'
                           AND t.status = '${constant.EXPENSE_STATUS.PENDING}') AS pending_expenses,
                        (SELECT COUNT(*) FROM executive_applications a WHERE a.is_deleted = 0 AND a.status = ?) AS pending_requests,
                        (SELECT COUNT(*) FROM media_items m WHERE m.is_deleted = 0 AND m.is_active = 1 AND m.status = ?) AS pending_media`,
                    [
                        ROLES.SUPER_ADMIN, ROLES.EXECUTIVE, EVENT_STATUS.POSTED, NOTICE_STATUS.PUBLISHED, DONATION_STATUS.PENDING,
                        EXEC_APPLICATION_STATUS.PENDING, MEDIA_STATUS.PENDING,
                    ],
                ),
                moneyTotals(from_date, to_date),
                before ? moneyTotals(before.from_date, before.to_date) : null,
                monthlyTotals(from_date, to_date),
                // 4. the newest events, notices, members, uploads, requests, donations and expenses
                recentActivities(constant.ACTIVITY_DASHBOARD_LIMIT, request.lang),
            ]);

            const pending = {
                donations: c.pending_donations,
                expenses: c.pending_expenses,
                executive_requests: c.pending_requests,
                media: c.pending_media,
            };
            return middleware.sendSuccess(res, "rest_keywords_success", {
                counts: {
                    total_members: c.total_members,
                    executives: c.executives,
                    active_events: c.active_events,
                    total_notices: c.total_notices,
                },
                money: {
                    total_donations: current.donations,
                    total_expenses: current.expenses,
                    balance: current.donations - current.expenses,
                    donation_trend: previous ? trend(current.donations, previous.donations) : null,
                    expense_trend: previous ? trend(current.expenses, previous.expenses) : null,
                },
                pending: { ...pending, total: Object.values(pending).reduce((sum, n) => sum + n, 0) },
                monthly: months.map((m) => ({ month: m.month, donations: money(m.donations), expenses: money(m.expenses) })),
                recent_activities: recent,
            });
        } catch (error) {
            return middleware.sendServerError(res, "getDashboard", error);
        }
    },

    // ---------- Members ----------

    // Shared by the list and the detail. Every member / executive that isn't deleted, any status / sign-up step.
    // The Super Admin is not listed (not a member).
    // filters: { id, search, role, status, signup, from_date, to_date }. Always one page (+ the COUNT)
    async listMembers({ filters = {}, sort = "joined", order = "desc", page = 1, limit = constant.DEFAULT_PAGE_SIZE, withTotal = true }) {
        const where = ["u.is_deleted = 0", "r.code <> ?"];
        const params = [ROLES.SUPER_ADMIN];

        if (filters.id) {
            where.push("u.id = ?");
            params.push(filters.id);
        }
        if (filters.search) {
            where.push("(u.full_name ILIKE ? OR u.mobile ILIKE ? OR u.email ILIKE ? OR u.member_code ILIKE ?)");
            const like = common.likeText(filters.search);
            params.push(like, like, like, like);
        }
        if (filters.role) {
            where.push("r.code = ?");
            params.push(filters.role);
        }
        if (filters.status) {
            where.push("u.status = ?");
            params.push(filters.status);
        }
        if (filters.signup) {
            where.push(filters.signup === MEMBER_SIGNUP_FILTER.COMPLETED ? "u.signup_step = 'completed'" : "u.signup_step <> 'completed'");
        }
        if (filters.from_date) {
            where.push("u.created_at::date >= CAST(? AS date)");
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            where.push("u.created_at::date <= CAST(? AS date)");
            params.push(filters.to_date);
        }

        const from = `FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE ${where.join(" AND ")}`;
        const { rows, pagination } = await query.fetchPage(
            `SELECT u.id, u.member_code, u.full_name, u.email, u.country_code, u.mobile, r.code AS role, u.status,
                u.signup_step, u.email_verified_at, u.created_at, u.last_login_at, p.address_line1 AS address, p.photo_url
             ${from}
             ORDER BY ${MEMBER_SORT_SQL[sort] ?? MEMBER_SORT_SQL.joined} ${order === "asc" ? "ASC" : "DESC"} NULLS LAST, u.id DESC`,
            `SELECT COUNT(*) AS total ${from}`,
            params,
            { page, limit, withTotal },
        );
        return { members: rows.map(toMember), pagination };
    },

    // GET /admin/members?page=&limit=&search=&role=&status=&signup=&from_date=&to_date=&sort=&order=
    async getMembers(request, res) {
        try {
            const { page, limit, sort, order, ...filters } = request.body;
            const data = await this.listMembers({ filters, sort, order, page, limit });
            return middleware.sendSuccess(res, "rest_keywords_success", data);
        } catch (error) {
            return middleware.sendServerError(res, "adminGetMembers", error);
        }
    },

    // One member + their donation summary and latest donations (3 small queries, run together)
    async getMemberDetails(request, res) {
        try {
            const id = routeId(request);
            if (!id) return middleware.sendError(res, "rest_member_not_found");

            const [{ members }, [[summary]], [recent]] = await Promise.all([
                this.listMembers({ filters: { id }, limit: 1, withTotal: false }),
                db.query(
                    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
                     FROM donations WHERE donor_user_id = ? AND is_deleted = 0 AND status = ?`,
                    [id, DONATION_STATUS.SUCCESS],
                ),
                db.query(
                    `SELECT id, amount, purpose, method, status, reference_no, created_at, confirmed_at
                     FROM donations WHERE donor_user_id = ? AND is_deleted = 0
                     ORDER BY created_at DESC, id DESC LIMIT ?`,
                    [id, constant.MEMBER_RECENT_DONATIONS],
                ),
            ]);
            if (!members[0]) return middleware.sendError(res, "rest_member_not_found");

            return middleware.sendSuccess(res, "rest_keywords_success", {
                member: members[0],
                donations: {
                    confirmed_count: summary.count,
                    confirmed_total: money(summary.total),
                    recent: recent.map((d) => ({ ...d, amount: money(d.amount) })),
                },
            });
        } catch (error) {
            return middleware.sendServerError(res, "adminGetMemberDetails", error);
        }
    },

    // POST /admin/members: a member added by hand (people who don't sign up in the app). Sign-up is already
    // completed: they log in with this email / mobile and password, and get the next member code unless one is typed.
    // The email counts as verified (the Super Admin entered it). role executive → the default sections too
    async createMember(request, res) {
        try {
            const { username, email, country_code, mobile_number, password, address, member_code, role } = request.body;
            const id = await db.transaction(async (tx) => {
                const [result] = await query.insertQuery("users", {
                    full_name: username,
                    email,
                    country_code,
                    mobile: mobile_number,
                    password_hash: await bcrypt.hash(password, constant.BCRYPT_ROUNDS),
                    member_code: member_code || null,
                    email_verified_at: new Date(),
                    signup_step: "completed",
                    created_by: request.loginUser.id,
                }, "", tx);
                const user_id = result.insertId;
                await tx.query("UPDATE users SET role_id = (SELECT id FROM roles WHERE code = ?) WHERE id = ?", [role, user_id]);
                await query.insertQuery("user_profiles", { user_id, address_line1: address || null }, "", tx);
                if (role === ROLES.EXECUTIVE) {
                    await common.savePermissions(user_id, constant.DEFAULT_EXECUTIVE_SECTIONS, request.loginUser.id, tx);
                }
                return user_id;
            });
            if (!member_code) await common.assignMemberCode(id);

            const { members } = await this.listMembers({ filters: { id }, limit: 1, withTotal: false });
            return middleware.sendSuccess(res, "rest_member_added", { member: members[0] });
        } catch (error) {
            if (error.code === DB_ERROR.UNIQUE_VIOLATION && UNIQUE_MESSAGES[error.constraint]) {
                return middleware.sendError(res, UNIQUE_MESSAGES[error.constraint]);
            }
            return middleware.sendServerError(res, "adminCreateMember", error);
        }
    },

    // Changes only the fields sent: name, email, mobile (+ country code), address, member code
    async editMember(request, res) {
        try {
            const id = routeId(request);
            const { errorKey } = await findChangeableMember(id);
            if (errorKey) return middleware.sendError(res, errorKey);

            const { username, email, country_code, mobile_number, address, member_code } = request.body;
            const userChanges = {
                ...(username !== undefined ? { full_name: username } : {}),
                ...(email !== undefined ? { email } : {}),
                ...(mobile_number !== undefined ? { country_code, mobile: mobile_number } : {}),
                ...(member_code !== undefined ? { member_code: member_code || null } : {}),
            };

            await db.transaction(async (tx) => {
                if (Object.keys(userChanges).length) {
                    await query.updateQuery("users", userChanges, "id = ?", [id], tx);
                }
                if (address !== undefined) {
                    await query.upsertQuery("user_profiles", { user_id: id, address_line1: address || null }, ["user_id"], tx);
                }
            });

            const { members } = await this.listMembers({ filters: { id }, limit: 1, withTotal: false });
            return middleware.sendSuccess(res, "rest_member_updated", { member: members[0] });
        } catch (error) {
            if (error.code === DB_ERROR.UNIQUE_VIOLATION && UNIQUE_MESSAGES[error.constraint]) {
                return middleware.sendError(res, UNIQUE_MESSAGES[error.constraint]);
            }
            return middleware.sendServerError(res, "adminEditMember", error);
        }
    },

    // Deactivate (suspended) or activate. A suspended member is refused on their next request (tokenMiddleware)
    async setMemberStatus(request, res) {
        try {
            const id = routeId(request);
            const { errorKey } = await findChangeableMember(id);
            if (errorKey) return middleware.sendError(res, errorKey);

            const { status } = request.body;
            await query.updateQuery("users", { status }, "id = ?", [id]);

            const { members } = await this.listMembers({ filters: { id }, limit: 1, withTotal: false });
            const message = status === USER_STATUS.SUSPENDED ? "rest_member_deactivated" : "rest_member_activated";
            return middleware.sendSuccess(res, message, { member: members[0] });
        } catch (error) {
            return middleware.sendServerError(res, "adminSetMemberStatus", error);
        }
    },

    // Soft delete + log out every device. Donations and other records stay
    async deleteMember(request, res) {
        try {
            const id = routeId(request);
            const { errorKey } = await findChangeableMember(id);
            if (errorKey) return middleware.sendError(res, errorKey);

            await db.transaction(async (tx) => {
                await query.updateQuery("users", { is_deleted: 1 }, "id = ?", [id], tx);
                await query.updateQuery("user_devices", constant.LOGGED_OUT_DEVICE, "user_id = ?", [id], tx);
            });
            return middleware.sendSuccess(res, "rest_member_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "adminDeleteMember", error);
        }
    },

    // ---------- Executives ----------

    // GET /admin/executives?page=&limit=&search=&sort=&order= : executives (the members list) with their permissions.
    // One extra query for the permissions of the executives on this page
    async getExecutives(request, res) {
        try {
            const { page, limit, sort, order, search } = request.body;
            // Only active executives: a deactivated one is hidden here (and refused on login) until reactivated
            const { members, pagination } = await this.listMembers({
                filters: { role: ROLES.EXECUTIVE, status: USER_STATUS.ACTIVE, search }, sort, order, page, limit,
            });
            const [rows] = members.length
                ? await db.query(
                    `SELECT p.user_id, m.code FROM executive_permissions p
                     JOIN modules m ON m.id = p.module_id
                     WHERE p.user_id = ANY(?::bigint[]) AND p.is_active = 1 AND m.is_deleted = 0`,
                    [members.map((m) => m.id)],
                )
                : [[]];
            const executives = members.map((m) => ({
                ...m,
                permissions: { sections: rows.filter((r) => r.user_id === m.id).map((r) => r.code) },
            }));
            return middleware.sendSuccess(res, "rest_keywords_success", { executives, pagination });
        } catch (error) {
            return middleware.sendServerError(res, "getExecutives", error);
        }
    },

    // PUT /admin/executives/:id/permissions: replaces an executive's sections. Applies on their next request
    async setExecutivePermissions(request, res) {
        try {
            const id = routeId(request);
            const [rows] = id
                ? await db.query(
                    "SELECT r.code AS role, u.status FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.is_deleted = 0",
                    [id],
                )
                : [[]];
            if (!rows[0]) return middleware.sendError(res, "rest_member_not_found");
            if (rows[0].role !== ROLES.EXECUTIVE) return middleware.sendError(res, "rest_not_an_executive");
            if (rows[0].status !== USER_STATUS.ACTIVE) return middleware.sendError(res, "rest_member_inactive");

            const { sections } = request.body;
            await common.savePermissions(id, sections, request.loginUser.id);
            return middleware.sendSuccess(res, "rest_permissions_updated", { permissions: await common.loadPermissions(id) });
        } catch (error) {
            return middleware.sendServerError(res, "setExecutivePermissions", error);
        }
    },

    // ---------- Donations (panel) ----------

    // Shared by the list, the detail and the reports. filters: { id, search, status, mode, purpose, donor_user_id, from_date, to_date }.
    // A donor is a member (name from users) or a name typed in the panel. Totals of the same filters come back as summary
    async listDonations({ filters = {}, sort = "date", order = "desc", page = 1, limit = constant.DEFAULT_PAGE_SIZE, withTotal = true, withSummary = false }) {
        const where = ["d.is_deleted = 0"];
        const params = [];
        const add = (sql, ...values) => {
            where.push(sql);
            params.push(...values);
        };
        if (filters.id) add("d.id = ?", filters.id);
        if (filters.status) add("d.status = ?", filters.status);
        if (filters.mode) add("d.method = ANY(?::text[])", constant.DONATION_METHODS_BY_MODE[filters.mode]);
        if (filters.purpose) add("d.purpose = ?", filters.purpose);
        if (filters.donor_user_id) add("d.donor_user_id = ?", filters.donor_user_id);
        if (filters.from_date) add("d.donated_on >= CAST(? AS date)", filters.from_date);
        if (filters.to_date) add("d.donated_on <= CAST(? AS date)", filters.to_date);
        if (filters.search) {
            const like = common.likeText(filters.search);
            const receiptNo = common.recordNoSql("d.id", constant.RECORD_NO_PREFIX.DONATION);
            add(`(COALESCE(du.full_name, d.donor_name) ILIKE ? OR du.member_code ILIKE ? OR d.reference_no ILIKE ? OR ${receiptNo} ILIKE ?)`, like, like, like, like);
        }

        const from = `FROM donations d
             LEFT JOIN users du ON du.id = d.donor_user_id
             LEFT JOIN users eb ON eb.id = d.entered_by
             LEFT JOIN users vb ON vb.id = d.verified_by
             WHERE ${where.join(" AND ")}`;
        const sortSql = sort === "amount" ? "d.amount" : "d.donated_on";
        const [{ rows, pagination }, summary] = await Promise.all([
            query.fetchPage(
                `SELECT d.id, d.donor_user_id, COALESCE(du.full_name, d.donor_name) AS donor_name, du.member_code,
                    d.amount, d.purpose, d.method, d.status, d.reference_no, TO_CHAR(d.donated_on, 'YYYY-MM-DD') AS donated_on,
                    d.proof_url, d.note, d.created_at, d.confirmed_at,
                    eb.full_name AS entered_by_name, vb.full_name AS verified_by_name
                 ${from}
                 ORDER BY ${sortSql} ${order === "asc" ? "ASC" : "DESC"}, d.id DESC`,
                `SELECT COUNT(*) AS total ${from}`,
                params,
                { page, limit, withTotal },
            ),
            withSummary
                ? db.query(
                    `SELECT COUNT(*) AS count,
                        COALESCE(SUM(d.amount) FILTER (WHERE d.status = ?), 0) AS verified_total,
                        COALESCE(MAX(d.amount) FILTER (WHERE d.status = ?), 0) AS highest,
                        COALESCE(ROUND(AVG(d.amount) FILTER (WHERE d.status = ?)), 0) AS average
                     ${from}`,
                    [DONATION_STATUS.SUCCESS, DONATION_STATUS.SUCCESS, DONATION_STATUS.SUCCESS, ...params],
                )
                : null,
        ]);
        const donations = rows.map((d) => ({ ...d, amount: money(d.amount), proof_url: common.mediaUrl(d.proof_url) }));
        const s = summary?.[0]?.[0];
        return {
            donations,
            pagination,
            ...(s ? { summary: { count: s.count, verified_total: money(s.verified_total), highest: money(s.highest), average: money(s.average) } } : {}),
        };
    },

    // GET /admin/donations?page=&limit=&search=&status=&mode=&purpose=&from_date=&to_date=&sort=&order=
    async getDonations(request, res) {
        try {
            const { page, limit, sort, order, ...filters } = request.body;
            return middleware.sendSuccess(res, "rest_keywords_success", await this.listDonations({ filters, sort, order, page, limit, withSummary: true }));
        } catch (error) {
            return middleware.sendServerError(res, "getDonations", error);
        }
    },

    async getDonationDetails(request, res) {
        try {
            const id = routeId(request);
            const { donations } = id ? await this.listDonations({ filters: { id }, limit: 1, withTotal: false }) : { donations: [] };
            return donations[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { donation: donations[0] })
                : middleware.sendError(res, "rest_donation_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getDonationDetails", error);
        }
    },

    // POST (create) / PUT /admin/donations/:id (edit, replaces the fields). A member donor or a typed name
    async saveDonation(request, res) {
        try {
            const id = request.params.id ? routeId(request) : null;
            if (request.params.id && !id) return middleware.sendError(res, "rest_donation_not_found");
            const body = request.body;
            if (body.proof_url && !common.isInMediaFolder(body.proof_url, "finance")) {
                return middleware.sendError(res, "rest_invalid_media_folder");
            }

            let before = null;
            if (id) {
                const [rows] = await db.query("SELECT id, status FROM donations WHERE id = ? AND is_deleted = 0", [id]);
                before = rows[0];
                if (!before) return middleware.sendError(res, "rest_donation_not_found");
            }
            // The app sends the member code (GM0012) instead of the member's id
            if (!body.donor_user_id && body.member_code) {
                const [[member]] = await db.query("SELECT id FROM users WHERE member_code = ? AND is_deleted = 0", [body.member_code]);
                if (!member) return middleware.sendError(res, "rest_donor_not_found");
                body.donor_user_id = member.id;
            }
            const statusChanged = !before || before.status !== body.status;
            const data = {
                donor_user_id: body.donor_user_id ?? null,
                donor_name: body.donor_user_id ? null : body.donor_name,
                amount: body.amount,
                purpose: body.purpose,
                method: body.method,
                reference_no: body.reference_no || null,
                donated_on: body.donated_on,
                proof_url: body.proof_url || null,
                note: body.note || null,
                status: body.status,
                ...(statusChanged ? donationStatusColumns(body.status, request.loginUser.id) : {}),
            };

            let donationId = id;
            if (id) {
                await query.updateQuery("donations", data, "id = ?", [id]);
            } else {
                const [result] = await query.insertQuery("donations", { ...data, entered_by: request.loginUser.id });
                donationId = result.insertId;
                // An executive's entry waiting for verification: the Super Admin is told (as for a member's donation)
                if (body.status === DONATION_STATUS.PENDING && !common.hasRole(request.loginUser, constant.SEE_ALL_ROLES)) {
                    common.notifyAdmins("notify_donation", "notify_admin_donation", `₹${Number(body.amount).toLocaleString("en-IN")} · ${body.purpose}`, "donation", donationId);
                }
            }
            if (id && statusChanged) tellDonor(donationId, body.status, request.loginUser.id);

            const { donations } = await this.listDonations({ filters: { id: donationId }, limit: 1, withTotal: false });
            return middleware.sendSuccess(res, id ? "rest_donation_updated" : "rest_donation_saved", { donation: donations[0] });
        } catch (error) {
            if (error.code === DB_ERROR.UNIQUE_VIOLATION && error.constraint === "uq_donations_upi_reference") {
                return middleware.sendError(res, "rest_donation_reference_used");
            }
            if (error.code === DB_ERROR.FOREIGN_KEY_VIOLATION) return middleware.sendError(res, "rest_donor_not_found");
            return middleware.sendServerError(res, "saveDonation", error);
        }
    },

    // PUT /admin/donations/:id/status: success (verified) / pending / rejected. The member donor is told
    async setDonationStatus(request, res) {
        try {
            const id = routeId(request);
            const { status } = request.body;
            const [result] = id
                ? await query.updateQuery("donations", { status, ...donationStatusColumns(status, request.loginUser.id) }, "id = ? AND is_deleted = 0", [id])
                : [{ affectedRows: 0 }];
            if (!result.affectedRows) return middleware.sendError(res, "rest_donation_not_found");

            tellDonor(id, status, request.loginUser.id);
            const { donations } = await this.listDonations({ filters: { id }, limit: 1, withTotal: false });
            return middleware.sendSuccess(res, "rest_donation_status_changed", { donation: donations[0] });
        } catch (error) {
            return middleware.sendServerError(res, "setDonationStatus", error);
        }
    },

    async deleteDonation(request, res) {
        try {
            const id = routeId(request);
            const [result] = id ? await query.updateQuery("donations", { is_deleted: 1 }, "id = ? AND is_deleted = 0", [id]) : [{ affectedRows: 0 }];
            if (!result.affectedRows) return middleware.sendError(res, "rest_donation_not_found");
            return middleware.sendSuccess(res, "rest_donation_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "deleteDonation", error);
        }
    },

    // ---------- Expenses (cash-book "paid" rows) ----------

    // filters: { id, search, status, mode, category, from_date, to_date }. Totals of the same filters as summary
    async listExpenses({ filters = {}, sort = "date", order = "desc", page = 1, limit = constant.DEFAULT_PAGE_SIZE, withTotal = true, withSummary = false }) {
        const where = ["t.is_deleted = 0", "t.entry_type = ?"];
        const params = [TRANSACTION_TYPE.PAID];
        const add = (sql, ...values) => {
            where.push(sql);
            params.push(...values);
        };
        if (filters.id) add("t.id = ?", filters.id);
        if (filters.status) add("t.status = ?", filters.status);
        if (filters.mode) add("t.mode = ?", filters.mode);
        if (filters.category) add("t.category = ?", filters.category);
        if (filters.from_date) add("t.txn_date >= CAST(? AS date)", filters.from_date);
        if (filters.to_date) add("t.txn_date <= CAST(? AS date)", filters.to_date);
        if (filters.search) {
            const like = common.likeText(filters.search);
            const expenseNo = common.recordNoSql("t.id", constant.RECORD_NO_PREFIX.EXPENSE);
            add(`(t.description ILIKE ? OR t.paid_to ILIKE ? OR t.reference_no ILIKE ? OR ${expenseNo} ILIKE ?)`, like, like, like, like);
        }

        const from = `FROM society_transactions t
             LEFT JOIN users eb ON eb.id = t.entered_by
             LEFT JOIN users vb ON vb.id = t.verified_by
             WHERE ${where.join(" AND ")}`;
        const sortSql = sort === "amount" ? "t.amount" : "t.txn_date";
        const [{ rows, pagination }, summary, categories] = await Promise.all([
            query.fetchPage(
                `SELECT t.id, t.description, t.paid_to, t.category, t.amount, t.mode, t.reference_no,
                    TO_CHAR(t.txn_date, 'YYYY-MM-DD') AS txn_date, t.status, t.bill_url, t.created_at,
                    eb.full_name AS entered_by_name, vb.full_name AS verified_by_name
                 ${from}
                 ORDER BY ${sortSql} ${order === "asc" ? "ASC" : "DESC"}, t.id DESC`,
                `SELECT COUNT(*) AS total ${from}`,
                params,
                { page, limit, withTotal },
            ),
            withSummary
                ? db.query(
                    `SELECT COUNT(*) AS count,
                        COALESCE(SUM(t.amount) FILTER (WHERE ${VERIFIED_EXPENSE}), 0) AS verified_total,
                        COALESCE(MAX(t.amount) FILTER (WHERE ${VERIFIED_EXPENSE}), 0) AS highest,
                        COALESCE(ROUND(AVG(t.amount) FILTER (WHERE ${VERIFIED_EXPENSE})), 0) AS average
                     ${from}`,
                    params,
                )
                : null,
            // Verified spending per category (the app's Expense Breakdown), largest first
            withSummary
                ? db.query(
                    `SELECT t.category, SUM(t.amount) AS amount
                     ${from} AND ${VERIFIED_EXPENSE}
                     GROUP BY t.category ORDER BY SUM(t.amount) DESC`,
                    params,
                )
                : null,
        ]);
        const expenses = rows.map((e) => ({ ...e, amount: money(e.amount), bill_url: common.mediaUrl(e.bill_url) }));
        const s = summary?.[0]?.[0];
        return {
            expenses,
            pagination,
            ...(s
                ? {
                    summary: {
                        count: s.count,
                        verified_total: money(s.verified_total),
                        highest: money(s.highest),
                        average: money(s.average),
                        categories: categories[0].map((c) => ({ category: c.category, amount: money(c.amount) })),
                    },
                }
                : {}),
        };
    },

    // GET /admin/expenses?page=&limit=&search=&status=&mode=&category=&from_date=&to_date=&sort=&order=
    async getExpenses(request, res) {
        try {
            const { page, limit, sort, order, ...filters } = request.body;
            // income = verified donations in the same dates; balance = all verified donations − all verified expenses
            const [list, period, allTime, settings] = await Promise.all([
                this.listExpenses({ filters, sort, order, page, limit, withSummary: true }),
                moneyTotals(filters.from_date, filters.to_date),
                moneyTotals(),
                common.getSettings(),
            ]);
            list.summary.income = period.donations;
            list.summary.balance = allTime.donations - allTime.expenses;
            // The society's expense categories (App Settings), for the app's Add Expense form
            return middleware.sendSuccess(res, "rest_keywords_success", { ...list, expense_categories: settings.expense_categories });
        } catch (error) {
            return middleware.sendServerError(res, "getExpenses", error);
        }
    },

    async getExpenseDetails(request, res) {
        try {
            const id = routeId(request);
            const { expenses } = id ? await this.listExpenses({ filters: { id }, limit: 1, withTotal: false }) : { expenses: [] };
            return expenses[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { expense: expenses[0] })
                : middleware.sendError(res, "rest_expense_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getExpenseDetails", error);
        }
    },

    // POST (create) / PUT /admin/expenses/:id (edit, replaces the fields)
    async saveExpense(request, res) {
        try {
            const id = request.params.id ? routeId(request) : null;
            if (request.params.id && !id) return middleware.sendError(res, "rest_expense_not_found");
            const body = request.body;
            if (body.bill_url && !common.isInMediaFolder(body.bill_url, "finance")) {
                return middleware.sendError(res, "rest_invalid_media_folder");
            }

            let before = null;
            if (id) {
                const [rows] = await db.query("SELECT id, status FROM society_transactions WHERE id = ? AND entry_type = ? AND is_deleted = 0", [id, TRANSACTION_TYPE.PAID]);
                before = rows[0];
                if (!before) return middleware.sendError(res, "rest_expense_not_found");
            }
            const data = {
                description: body.description,
                paid_to: body.paid_to,
                category: body.category,
                amount: body.amount,
                mode: body.mode,
                reference_no: body.reference_no || null,
                txn_date: body.txn_date,
                bill_url: body.bill_url || null,
                status: body.status,
                ...(!before || before.status !== body.status ? { verified_by: body.status === EXPENSE_STATUS.PENDING ? null : request.loginUser.id } : {}),
            };

            let expenseId = id;
            if (id) {
                await query.updateQuery("society_transactions", data, "id = ?", [id]);
            } else {
                const [result] = await query.insertQuery("society_transactions", { ...data, entry_type: TRANSACTION_TYPE.PAID, entered_by: request.loginUser.id });
                expenseId = result.insertId;
                // An executive's expense waiting for verification: the Super Admin is told
                if (body.status === EXPENSE_STATUS.PENDING && !common.hasRole(request.loginUser, constant.SEE_ALL_ROLES)) {
                    common.notifyAdmins("notify_expense", "notify_admin_expense", `₹${Number(body.amount).toLocaleString("en-IN")} · ${body.description}`, "expense", expenseId);
                }
            }
            const { expenses } = await this.listExpenses({ filters: { id: expenseId }, limit: 1, withTotal: false });
            return middleware.sendSuccess(res, id ? "rest_expense_updated" : "rest_expense_saved", { expense: expenses[0] });
        } catch (error) {
            return middleware.sendServerError(res, "saveExpense", error);
        }
    },

    // PUT /admin/expenses/:id/status: verified / pending / rejected
    async setExpenseStatus(request, res) {
        try {
            const id = routeId(request);
            const { status } = request.body;
            const [result] = id
                ? await query.updateQuery(
                    "society_transactions",
                    { status, verified_by: status === EXPENSE_STATUS.PENDING ? null : request.loginUser.id },
                    "id = ? AND entry_type = ? AND is_deleted = 0",
                    [id, TRANSACTION_TYPE.PAID],
                )
                : [{ affectedRows: 0 }];
            if (!result.affectedRows) return middleware.sendError(res, "rest_expense_not_found");

            const { expenses } = await this.listExpenses({ filters: { id }, limit: 1, withTotal: false });
            return middleware.sendSuccess(res, "rest_expense_status_changed", { expense: expenses[0] });
        } catch (error) {
            return middleware.sendServerError(res, "setExpenseStatus", error);
        }
    },

    async deleteExpense(request, res) {
        try {
            const id = routeId(request);
            const [result] = id
                ? await query.updateQuery("society_transactions", { is_deleted: 1 }, "id = ? AND entry_type = ? AND is_deleted = 0", [id, TRANSACTION_TYPE.PAID])
                : [{ affectedRows: 0 }];
            if (!result.affectedRows) return middleware.sendError(res, "rest_expense_not_found");
            return middleware.sendSuccess(res, "rest_expense_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "deleteExpense", error);
        }
    },

    // ---------- Financial reports ----------

    // Donations and expenses together, newest first (any status), one page. filters: { from_date, to_date, category, mode }
    async listTransactions({ filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, withTotal = true }) {
        const { union, params } = transactionsUnion(filters);
        const { rows, pagination } = await query.fetchPage(
            `SELECT kind, id, TO_CHAR(day, 'YYYY-MM-DD') AS date, description, category, mode, amount, status ${union}
             ORDER BY day DESC, created_at DESC, id DESC`,
            `SELECT COUNT(*) AS total ${union}`,
            params,
            { page, limit, withTotal },
        );
        return { transactions: rows.map((t) => ({ ...t, amount: money(t.amount) })), pagination };
    },

    // GET /admin/finance?from_date=&to_date= : the Financial Overview (cards with trends, chart, latest transactions)
    async getFinanceOverview(request, res) {
        try {
            const { from_date, to_date } = request.body;
            const before = from_date && to_date ? previousPeriod(from_date, to_date) : null;
            const [current, previous, months, recent] = await Promise.all([
                moneyTotals(from_date, to_date),
                before ? moneyTotals(before.from_date, before.to_date) : null,
                monthlyTotals(from_date, to_date),
                this.listTransactions({ filters: { from_date, to_date }, limit: constant.FINANCE_RECENT_LIMIT, withTotal: false }),
            ]);
            return middleware.sendSuccess(res, "rest_keywords_success", {
                totals: {
                    donations: current.donations,
                    expenses: current.expenses,
                    balance: current.donations - current.expenses,
                    transactions: current.transactions,
                    donation_trend: previous ? trend(current.donations, previous.donations) : null,
                    expense_trend: previous ? trend(current.expenses, previous.expenses) : null,
                },
                monthly: months.map((m) => ({ month: m.month, donations: money(m.donations), expenses: money(m.expenses) })),
                recent: recent.transactions,
            });
        } catch (error) {
            return middleware.sendServerError(res, "getFinanceOverview", error);
        }
    },

    // GET /admin/reports/:type?from_date=&to_date=&category=&mode=&page=&limit= : the rows of one report.
    // Lists (donation, expense, custom) are paged like every list; summary / category / monthly are small totals
    async getReportData(request, res) {
        try {
            const type = request.params.type;
            if (!constant.REPORT_TYPES.includes(type)) return middleware.sendError(res, "rest_report_not_found");
            const { page, limit, category, mode, from_date, to_date } = request.body;
            const range = { from_date, to_date };
            const onePage = (rows) => ({ rows, pagination: { page: 1, limit: rows.length, total: rows.length, total_pages: 1, has_more: false } });

            if (type === "donation") {
                const { donations, pagination } = await this.listDonations({ filters: { ...range, purpose: category, mode }, page, limit });
                return middleware.sendSuccess(res, "rest_keywords_success", { rows: donations, pagination });
            }
            if (type === "expense") {
                const { expenses, pagination } = await this.listExpenses({ filters: { ...range, category, mode }, page, limit });
                return middleware.sendSuccess(res, "rest_keywords_success", { rows: expenses, pagination });
            }
            if (type === "custom") {
                const { transactions, pagination } = await this.listTransactions({ filters: { ...range, category, mode }, page, limit });
                return middleware.sendSuccess(res, "rest_keywords_success", { rows: transactions, pagination });
            }

            // Totals, added up by the database: verified entries only (pending counted for the summary), same filters
            const { union, params } = transactionsUnion({ ...range, category, mode });
            const VERIFIED = `status IN ('${DONATION_STATUS.SUCCESS}', '${EXPENSE_STATUS.VERIFIED}')`;
            if (type === "summary") {
                const [[t]] = await db.query(
                    `SELECT
                        COALESCE(SUM(amount) FILTER (WHERE kind = 'donation' AND ${VERIFIED}), 0) AS donations,
                        COALESCE(SUM(amount) FILTER (WHERE kind = 'expense' AND ${VERIFIED}), 0) AS expenses,
                        COUNT(*) FILTER (WHERE ${VERIFIED}) AS verified,
                        COUNT(*) FILTER (WHERE kind = 'donation' AND status = 'pending') AS pending_donations,
                        COUNT(*) FILTER (WHERE kind = 'expense' AND status = 'pending') AS pending_expenses
                     ${union}`,
                    params,
                );
                return middleware.sendSuccess(res, "rest_keywords_success", onePage([
                    { item: "total_donations", value: money(t.donations) },
                    { item: "total_expenses", value: money(t.expenses) },
                    { item: "balance", value: money(t.donations) - money(t.expenses) },
                    { item: "verified_transactions", value: t.verified },
                    { item: "pending_donations", value: t.pending_donations },
                    { item: "pending_expenses", value: t.pending_expenses },
                ]));
            }
            if (type === "category") {
                const [rows] = await db.query(
                    `SELECT kind, COALESCE(category, '') AS category, COUNT(*) AS entries, SUM(amount) AS amount
                     ${union} WHERE ${VERIFIED} GROUP BY kind, category ORDER BY kind, SUM(amount) DESC`,
                    params,
                );
                return middleware.sendSuccess(res, "rest_keywords_success", onePage(rows.map((r) => ({ ...r, amount: money(r.amount) }))));
            }
            const [rows] = await db.query(
                `SELECT TO_CHAR(day, 'YYYY-MM') AS month,
                    COALESCE(SUM(amount) FILTER (WHERE kind = 'donation'), 0) AS donations,
                    COALESCE(SUM(amount) FILTER (WHERE kind = 'expense'), 0) AS expenses
                 ${union} WHERE ${VERIFIED} GROUP BY 1 ORDER BY 1`,
                params,
            );
            return middleware.sendSuccess(res, "rest_keywords_success", onePage(rows.map((m) => ({
                month: m.month, donations: money(m.donations), expenses: money(m.expenses), balance: money(m.donations) - money(m.expenses),
            }))));
        } catch (error) {
            return middleware.sendServerError(res, "getReportData", error);
        }
    },

    // GET /admin/reports?page=&limit= : the "Generated Reports" history, newest first
    async getReports(request, res) {
        try {
            const { page, limit } = request.body;
            const { rows, pagination } = await query.fetchPage(
                `SELECT g.id, g.report_type, TO_CHAR(g.from_date, 'YYYY-MM-DD') AS from_date, TO_CHAR(g.to_date, 'YYYY-MM-DD') AS to_date,
                    g.category, g.mode, g.created_at, u.full_name AS generated_by_name
                 FROM generated_reports g LEFT JOIN users u ON u.id = g.generated_by
                 WHERE g.is_deleted = 0
                 ORDER BY g.created_at DESC, g.id DESC`,
                "SELECT COUNT(*) AS total FROM generated_reports g WHERE g.is_deleted = 0",
                [],
                { page, limit },
            );
            return middleware.sendSuccess(res, "rest_keywords_success", { reports: rows, pagination });
        } catch (error) {
            return middleware.sendServerError(res, "getReports", error);
        }
    },

    // POST /admin/reports: remembers a report the panel just built (the file itself is made in the browser)
    async saveReport(request, res) {
        try {
            const { report_type, from_date, to_date, category, mode } = request.body;
            const [result] = await query.insertQuery("generated_reports", {
                report_type,
                from_date: from_date || null,
                to_date: to_date || null,
                category: category || null,
                mode: mode || null,
                generated_by: request.loginUser.id,
            });
            return middleware.sendSuccess(res, "rest_report_saved", { report: { id: result.insertId } });
        } catch (error) {
            return middleware.sendServerError(res, "saveReport", error);
        }
    },

    async deleteReport(request, res) {
        try {
            const id = routeId(request);
            const [result] = id ? await query.updateQuery("generated_reports", { is_deleted: 1 }, "id = ? AND is_deleted = 0", [id]) : [{ affectedRows: 0 }];
            if (!result.affectedRows) return middleware.sendError(res, "rest_report_not_found");
            return middleware.sendSuccess(res, "rest_report_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "deleteReport", error);
        }
    },

    // ---------- App settings ----------

    // Everything the Settings screen shows: the settings (with notice_tags, the notice categories), the event
    // categories and the UPI details
    async settingsData(lang) {
        const [settings, [categories], [upiRows]] = await Promise.all([
            common.getSettings(),
            db.query("SELECT id, code, name, color FROM event_categories WHERE is_active = 1 AND is_deleted = 0 ORDER BY sort_order, id"),
            db.query(
                `SELECT payee_name, upi_id, qr_image_url, display_note FROM upi_settings
                 WHERE is_active = 1 AND is_deleted = 0 ORDER BY id DESC LIMIT 1`,
            ),
        ]);
        return {
            settings: { ...settings, logo_url: common.mediaUrl(settings.logo_url) },
            event_categories: categories.map((c) => ({ ...c, name: common.translate(lang, `category_${c.code}`, c.name) })),
            upi: upiRows[0] ? { ...upiRows[0], qr_image_url: common.mediaUrl(upiRows[0].qr_image_url) } : null,
        };
    },

    // GET /admin/settings
    // GET /admin/backup (Super Admin): every row of every table as SQL, returned as { file_name, sql }; the panel
    // saves it as a .sql file. Postgres writes each row (INSERT … json_populate_record), so every value keeps its
    // exact type. Tables come parents first (foreign keys), so the file loads into an empty schema.sql database
    // without superuser rights. Then the id sequences (and member_code_seq) are moved past the restored rows
    async getBackup(request, res) {
        try {
            const [[tables], [links], [[memberSeq]]] = await Promise.all([
                db.query(
                    `SELECT t.table_name AS name,
                        EXISTS (SELECT 1 FROM information_schema.columns c
                                WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'id') AS has_id
                     FROM information_schema.tables t
                     WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' ORDER BY t.table_name`,
                ),
                db.query(
                    `SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent
                     FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace`,
                ),
                db.query("SELECT last_value, is_called FROM member_code_seq"),
            ]);

            // Parents before children; a table in a loop (none today) is added at the end
            const ordered = [];
            const left = new Map(tables.map((t) => [t.name, t]));
            while (left.size) {
                const ready = [...left.values()].filter((t) =>
                    !links.some((l) => l.child === t.name && l.parent !== t.name && left.has(l.parent)));
                for (const t of ready.length ? ready : [...left.values()]) {
                    ordered.push(t);
                    left.delete(t.name);
                }
            }

            const now = new Date();
            const lines = [
                `-- ${(await common.getSettings()).society_name}: database backup, ${now.toISOString()}`,
                "-- Restore: create an empty database, run database/schema.sql (not seed.sql), then",
                "--   psql -U postgres -d <database> -f <this file>",
                "BEGIN;",
            ];
            for (const table of ordered) {
                // Table names come from the database catalogue (code), never from the request
                const [rows] = await db.query(
                    `SELECT format('INSERT INTO %I SELECT * FROM json_populate_record(NULL::%I, %L);', '${table.name}', '${table.name}', row_to_json(x)::text) AS line
                     FROM "${table.name}" x ${table.has_id ? "ORDER BY x.id" : ""}`,
                );
                lines.push("", `-- ${table.name}: ${rows.length} rows`, ...rows.map((r) => r.line));
                if (table.has_id) {
                    lines.push(`SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM "${table.name}"), 0), 1));`);
                }
            }
            lines.push("", `SELECT setval('member_code_seq', ${Number(memberSeq.last_value)}, ${memberSeq.is_called ? "true" : "false"});`, "COMMIT;", "");

            await common.saveSettings({ last_backup_at: now.toISOString() });
            return middleware.sendSuccess(res, "rest_keywords_success", {
                file_name: `society_app_backup_${now.toISOString().slice(0, 10)}.sql`,
                tables: ordered.length,
                sql: lines.join("\n"),
            });
        } catch (error) {
            return middleware.sendServerError(res, "getBackup", error);
        }
    },

    async getAppSettings(request, res) {
        try {
            return middleware.sendSuccess(res, "rest_keywords_success", await this.settingsData(request.lang));
        } catch (error) {
            return middleware.sendServerError(res, "getAppSettings", error);
        }
    },

    // PUT /admin/settings: only what is sent. event_categories = the full list [{ id?, name }]: items without an id are
    // added, categories left out are hidden (their events keep them). upi = the Donate screen's UPI details (null = none)
    async saveAppSettings(request, res) {
        try {
            const { event_categories, upi, ...settings } = request.body;
            for (const url of [settings.logo_url, upi?.qr_image_url]) {
                if (url && !common.isInMediaFolder(url, "branding")) return middleware.sendError(res, "rest_invalid_media_folder");
            }

            await db.transaction(async (tx) => {
                await common.saveSettings(settings, tx);
                if (event_categories) await syncEventCategories(event_categories, tx);
                if (upi !== undefined) await saveUpi(upi, request.loginUser.id, tx);
            });
            return middleware.sendSuccess(res, "rest_settings_saved", await this.settingsData(request.lang));
        } catch (error) {
            return middleware.sendServerError(res, "saveAppSettings", error);
        }
    },
};

export default adminModule;
