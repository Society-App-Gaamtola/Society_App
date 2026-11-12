import db from "../../../config/db.js";
import constant from "../../../config/constant.js";
import common from "../../../config/common.js";
import middleware from "../../../middleware/middleware.js";

const { EVENT_STATUS, NOTICE_STATUS, MEDIA_STATUS, HOME_LIST_LIMIT, HOME_HERO_LIMIT } = constant;

// Last day of the event (one-day events have no end_date)
const EVENT_LAST_DAY = "COALESCE(e.end_date, e.event_date)";
const NOTICE_DATE = "COALESCE(n.published_at, n.created_at)";

// Text for LIKE: % and _ typed by the user are matched as plain characters
const likeText = (text) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;

// Runs one page of a list, and the COUNT for its pagination at the same time
// withTotal = false skips the COUNT (the home page shows no pagination), pagination is then null
const fetchPage = async (selectSql, countSql, params, { page, limit, withTotal }) => {
    const [[rows], countResult] = await Promise.all([
        db.query(`${selectSql} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
        withTotal ? db.query(countSql, params) : null,
    ]);
    if (!withTotal) {
        return { rows, pagination: null };
    }

    const total = countResult[0][0].total;
    return {
        rows,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit), has_more: page * limit < total },
    };
};

// The :id in the URL, or null when it isn't a valid id
const routeId = (request) => {
    const id = Number(request.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const userModule = {
    // Shared by the home page, the events page and any other screen that lists events
    // filters: { id, search, category_id, from_date, to_date, upcoming_only, with_poster }
    // lang picks the category name (en / hi / gu, already checked by extractHeaderLanguage)
    // Order: upcoming and ongoing events soonest first, then finished events newest first
    async listEvents({ filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, lang = constant.DEFAULT_LANGUAGE, withTotal = true }) {
        const where = ["e.status = ?", "e.is_active = 1", "e.is_deleted = 0"];
        const params = [EVENT_STATUS.POSTED];

        if (filters.id) {
            where.push("e.id = ?");
            params.push(filters.id);
        }
        if (filters.search) {
            where.push("e.title LIKE ?");
            params.push(likeText(filters.search));
        }
        if (filters.category_id) {
            where.push("e.category_id = ?");
            params.push(filters.category_id);
        }
        // Events that run on any day of the range, so a multi-day event shows up on each of its days
        if (filters.from_date) {
            where.push(`${EVENT_LAST_DAY} >= DATE(?)`);
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            where.push("e.event_date <= DATE(?)");
            params.push(filters.to_date);
        }
        if (filters.upcoming_only) {
            where.push(`${EVENT_LAST_DAY} >= CURDATE()`);
        }
        if (filters.with_poster) {
            where.push("e.poster_url IS NOT NULL AND e.poster_url != ''");
        }

        const whereSql = where.join(" AND ");
        const { rows, pagination } = await fetchPage(
            `SELECT e.id, e.title, e.description,
                DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
                DATE_FORMAT(e.end_date, '%Y-%m-%d') AS end_date,
                e.start_time, e.end_time, e.venue_name, e.venue_address, e.map_link, e.poster_url,
                c.id AS category_id, c.code AS category_code, c.name_${lang} AS category_name, c.color AS category_color,
                CASE WHEN e.event_date > CURDATE() THEN 'upcoming'
                     WHEN ${EVENT_LAST_DAY} >= CURDATE() THEN 'ongoing'
                     ELSE 'completed' END AS event_status
             FROM events e
             JOIN event_categories c ON c.id = e.category_id
             WHERE ${whereSql}
             ORDER BY ${EVENT_LAST_DAY} < CURDATE(),
                CASE WHEN ${EVENT_LAST_DAY} >= CURDATE() THEN e.event_date END ASC,
                e.event_date DESC, e.start_time ASC, e.id DESC`,
            `SELECT COUNT(*) AS total FROM events e WHERE ${whereSql}`,
            params,
            { page, limit, withTotal },
        );

        const events = rows.map(({ category_id, category_code, category_name, category_color, poster_url, ...event }) => ({
            ...event,
            poster_url: common.mediaUrl(poster_url),
            category: { id: category_id, code: category_code, name: category_name, color: category_color },
        }));

        return { events, pagination };
    },

    // Shared by the home page, the notice board and any other screen that lists notices
    // filters: { id, search, tag, from_date, to_date }
    // A notice for "selected" members is shown only to them and to the person who posted it
    async listNotices({ user_id, filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, withTotal = true }) {
        const where = [
            "n.status = ?",
            "n.is_active = 1",
            "n.is_deleted = 0",
            "(n.published_at IS NULL OR n.published_at <= NOW())",
            `(n.audience = 'all' OR n.created_by = ?
              OR EXISTS (SELECT 1 FROM notice_recipients r WHERE r.notice_id = n.id AND r.user_id = ?))`,
        ];
        const params = [NOTICE_STATUS.PUBLISHED, user_id, user_id];

        if (filters.id) {
            where.push("n.id = ?");
            params.push(filters.id);
        }
        if (filters.search) {
            where.push("(n.title LIKE ? OR n.body LIKE ?)");
            params.push(likeText(filters.search), likeText(filters.search));
        }
        if (filters.tag) {
            where.push("n.tag = ?");
            params.push(filters.tag);
        }
        if (filters.from_date) {
            where.push(`DATE(${NOTICE_DATE}) >= DATE(?)`);
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            where.push(`DATE(${NOTICE_DATE}) <= DATE(?)`);
            params.push(filters.to_date);
        }

        const whereSql = where.join(" AND ");
        const { rows, pagination } = await fetchPage(
            `SELECT n.id, n.title, n.body, n.tag, n.event_id, ${NOTICE_DATE} AS published_at
             FROM notices n
             WHERE ${whereSql}
             ORDER BY ${NOTICE_DATE} DESC, n.id DESC`,
            `SELECT COUNT(*) AS total FROM notices n WHERE ${whereSql}`,
            params,
            { page, limit, withTotal },
        );

        return { notices: rows, pagination };
    },

    // Everything the home page needs in one call
    // hero_events: upcoming events with a poster, for the slider at the top
    // The three lists load at the same time, without COUNT queries: 3 queries in total
    async getHome(request, res) {
        try {
            const [hero, upcoming, notices] = await Promise.all([
                this.listEvents({
                    filters: { upcoming_only: true, with_poster: true },
                    limit: HOME_HERO_LIMIT,
                    lang: request.lang,
                    withTotal: false,
                }),
                this.listEvents({ filters: { upcoming_only: true }, limit: HOME_LIST_LIMIT, lang: request.lang, withTotal: false }),
                this.listNotices({ user_id: request.loginUser.id, limit: HOME_LIST_LIMIT, withTotal: false }),
            ]);

            return middleware.sendSuccess(res, "rest_keywords_success", {
                hero_events: hero.events,
                upcoming_events: upcoming.events,
                latest_notices: notices.notices,
            });
        } catch (error) {
            return middleware.sendServerError(res, "getHome", error);
        }
    },

    // upcoming=true leaves out finished events (volunteer screen)
    async getEvents(request, res) {
        try {
            const { page, limit, upcoming, ...filters } = request.body;
            const data = await this.listEvents({ filters: { ...filters, upcoming_only: upcoming }, page, limit, lang: request.lang });
            return middleware.sendSuccess(res, "rest_keywords_success", data);
        } catch (error) {
            return middleware.sendServerError(res, "getEvents", error);
        }
    },

    // One event, with the same fields as the list. Drafts and deleted events are "not found"
    async getEventDetails(request, res) {
        try {
            const id = routeId(request);
            const { events } = id
                ? await this.listEvents({ filters: { id }, limit: 1, lang: request.lang, withTotal: false })
                : { events: [] };
            return events[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { event: events[0] })
                : middleware.sendError(res, "rest_event_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getEventDetails", error);
        }
    },

    async getNotices(request, res) {
        try {
            const { page, limit, ...filters } = request.body;
            const data = await this.listNotices({ user_id: request.loginUser.id, filters, page, limit });
            return middleware.sendSuccess(res, "rest_keywords_success", data);
        } catch (error) {
            return middleware.sendServerError(res, "getNotices", error);
        }
    },

    // One notice. A notice this user isn't allowed to see is "not found"
    async getNoticeDetails(request, res) {
        try {
            const id = routeId(request);
            const { notices } = id
                ? await this.listNotices({ user_id: request.loginUser.id, filters: { id }, limit: 1, withTotal: false })
                : { notices: [] };
            return notices[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { notice: notices[0] })
                : middleware.sendError(res, "rest_notice_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getNoticeDetails", error);
        }
    },

    // ---------- Gallery (files live on Cloudinary, the database keeps their links) ----------

    // Approved photos and videos for everyone, plus the user's own ones still waiting for approval
    // filters: { id, category_id }. Newest first
    async listMedia({ user_id, filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, lang = constant.DEFAULT_LANGUAGE, withTotal = true }) {
        const where = [
            "m.is_active = 1",
            "m.is_deleted = 0",
            "((m.status = ? AND m.privacy = 'all_members') OR m.uploaded_by = ?)",
        ];
        const params = [MEDIA_STATUS.APPROVED, user_id];

        if (filters.id) {
            where.push("m.id = ?");
            params.push(filters.id);
        }
        if (filters.category_id) {
            where.push("m.category_id = ?");
            params.push(filters.category_id);
        }

        const whereSql = where.join(" AND ");
        const { rows, pagination } = await fetchPage(
            `SELECT m.id, m.media_type, m.media_url, m.thumbnail_url, m.caption, m.status, m.event_id, m.created_at,
                m.uploaded_by, u.full_name AS uploaded_by_name,
                c.id AS category_id, c.name_${lang} AS category_name, c.color AS category_color
             FROM media_items m
             JOIN event_categories c ON c.id = m.category_id
             JOIN users u ON u.id = m.uploaded_by
             WHERE ${whereSql}
             ORDER BY m.created_at DESC, m.id DESC`,
            `SELECT COUNT(*) AS total FROM media_items m WHERE ${whereSql}`,
            params,
            { page, limit, withTotal },
        );

        const media = rows.map(({ category_id, category_name, category_color, uploaded_by, ...item }) => ({
            ...item,
            is_mine: uploaded_by === user_id ? 1 : 0,
            category: { id: category_id, name: category_name, color: category_color },
        }));
        return { media, pagination };
    },

    // Gallery: the app has already uploaded the file to Cloudinary; this only stores the link it sends (one INSERT)
    // Executives' photos are published at once, members' photos wait for the Super Admin
    async saveMedia(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { media_url, media_type, thumbnail_url, public_id, file_size_bytes, category_id, event_id, caption } = request.body;

            // The file (and a video's thumbnail) must be in society_app/<env>/gallery/<yyyy>/<mm>/, as an image or video link
            const resourceType = media_type === "video" ? "video" : "image";
            const inFolder = common.isInMediaFolder(media_url, "gallery", user_id, resourceType)
                && (!thumbnail_url || common.isInMediaFolder(thumbnail_url, "gallery", user_id, "video"));
            if (!inFolder) {
                return middleware.sendError(res, "rest_invalid_media_folder");
            }

            const approved = constant.MEDIA_AUTO_APPROVE_ROLES.includes(request.loginUser.role);
            const status = approved ? MEDIA_STATUS.APPROVED : MEDIA_STATUS.PENDING;
            const [result] = await db.query("INSERT INTO media_items SET ?", [{
                uploaded_by: user_id,
                category_id,
                event_id: event_id ?? null,
                media_type,
                cloudinary_public_id: public_id,
                media_url,
                thumbnail_url: thumbnail_url ?? null,
                caption: caption || null,
                file_size_bytes: file_size_bytes ?? null,
                status,
                moderated_by: approved ? user_id : null,
                moderated_at: approved ? new Date() : null,
            }]);

            return middleware.sendSuccess(res, approved ? "rest_media_saved" : "rest_media_pending", {
                media: { id: result.insertId, media_url, status },
            });
        } catch (error) {
            // category_id or event_id that doesn't exist
            if (error.code === "ER_NO_REFERENCED_ROW_2") {
                return middleware.sendError(res, error.message.includes("fk_media_event") ? "rest_event_not_found" : "rest_category_not_found");
            }
            return middleware.sendServerError(res, "saveMedia", error);
        }
    },

    async getMedia(request, res) {
        try {
            const { page, limit, ...filters } = request.body;
            const data = await this.listMedia({ user_id: request.loginUser.id, filters, page, limit, lang: request.lang });
            return middleware.sendSuccess(res, "rest_keywords_success", data);
        } catch (error) {
            return middleware.sendServerError(res, "getMedia", error);
        }
    },

    // For the category filter on the events page, in the app's language
    async getEventCategories(request, res) {
        try {
            const [categories] = await db.query(
                `SELECT id, code, name_${request.lang} AS name, color FROM event_categories
                 WHERE is_active = 1 AND is_deleted = 0
                 ORDER BY sort_order, id`,
            );
            return middleware.sendSuccess(res, "rest_keywords_success", { categories });
        } catch (error) {
            return middleware.sendServerError(res, "getEventCategories", error);
        }
    },
};

export default userModule;
