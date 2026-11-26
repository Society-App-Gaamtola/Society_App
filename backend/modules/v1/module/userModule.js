import db from "../../../config/db.js";
import query from "../../../config/dbHelper.js";
import constant from "../../../config/constant.js";
import common from "../../../config/common.js";
import middleware from "../../../middleware/middleware.js";
import { translatedColumns, translationJoin } from "../../../config/translator.js";

const {
    EVENT_STATUS, NOTICE_STATUS, MEDIA_STATUS, HOME_LIST_LIMIT, HOME_HERO_LIMIT, DB_ERROR,
    DONATION_STATUS, UPI_METHODS, EXEC_APPLICATION_STATUS,
} = constant;

// Last day of the event (one-day events have no end_date)
const EVENT_LAST_DAY = "COALESCE(e.end_date, e.event_date)";
const NOTICE_DATE = "COALESCE(n.published_at, n.created_at)";

// Categories are stored with an English name only; the Hindi / Gujarati name comes from languages/ (category_<code>)
const categoryName = (lang, code, name) => common.translate(lang, `category_${code}`, name);

const { routeId } = common;

// Pagination for the lists that run their own COUNT (notifications, members, donations)
const pageInfo = (page, limit, total) => ({ page, limit, total, total_pages: Math.ceil(total / limit), has_more: page * limit < total });

// NUMERIC amounts come back from PostgreSQL as text
const money = (value) => (value == null ? null : Number(value));
const { CREATOR_ROLES, NOTICE_AUDIENCE } = constant;

// A gallery item that isn't deleted (any status), or null
const findMedia = async (id) => {
    const [rows] = await db.query("SELECT id, uploaded_by, status FROM media_items WHERE id = ? AND is_deleted = 0", [id]);
    return rows[0] || null;
};

// The gallery's tables (the uploader and the category are joined for their names, and for search)
const MEDIA_FROM = `FROM media_items m
             JOIN event_categories c ON c.id = m.category_id
             JOIN users u ON u.id = m.uploaded_by`;

// WHERE of a gallery list, shared by the page, its COUNT and the moderation tab counts.
// filters: { id, status, media_type, uploaded_by, event_id, category_id, search, from_date, to_date }
//   executiveView = false: approved items everyone may see, plus the user's own (status is ignored)
const mediaWhere = ({ user_id, filters, executiveView }) => {
    const where = ["m.is_active = 1", "m.is_deleted = 0"];
    const params = [];
    const add = (sql, ...values) => {
        where.push(sql);
        params.push(...values);
    };

    if (!executiveView) add("((m.status = ? AND m.privacy = 'all_members') OR m.uploaded_by = ?)", MEDIA_STATUS.APPROVED, user_id);
    else if (filters.status) add("m.status = ?", filters.status);
    if (filters.media_type) add("m.media_type = ?", filters.media_type);
    if (filters.uploaded_by) add("m.uploaded_by = ?", filters.uploaded_by);
    if (filters.event_id) add("m.event_id = ?", filters.event_id);
    if (filters.id) add("m.id = ?", filters.id);
    if (filters.category_id) add("m.category_id = ?", filters.category_id);
    if (filters.search) {
        const like = common.likeText(filters.search);
        add("(m.caption ILIKE ? OR u.full_name ILIKE ? OR c.name ILIKE ?)", like, like, like);
    }
    if (filters.from_date) add("m.created_at::date >= CAST(? AS date)", filters.from_date);
    if (filters.to_date) add("m.created_at::date <= CAST(? AS date)", filters.to_date);
    return { where, params };
};

const userModule = {
    // Shared by the home page, the events page, the executive APIs and any other screen that lists events
    // filters: { id, search, category_id, from_date, to_date, upcoming_only, with_poster, featured_first }
    //   executiveView = true (executive / Super Admin): every status, plus filters { status, created_by } and the review fields
    // lang picks the category name (en / hi / gu, already checked by extractHeaderLanguage)
    // Order: upcoming and ongoing events soonest first, then finished events newest first (executiveView: last changed first)
    async listEvents({ filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, lang = constant.DEFAULT_LANGUAGE, withTotal = true, executiveView = false }) {
        const where = ["e.is_active = 1", "e.is_deleted = 0"];
        const params = [];

        if (!executiveView) {
            where.push("e.status = ?");
            params.push(EVENT_STATUS.POSTED);
        } else if (filters.status) {
            where.push("e.status = ?");
            params.push(filters.status);
        }
        if (filters.created_by) {
            where.push("e.created_by = ?");
            params.push(filters.created_by);
        }
        if (filters.id) {
            where.push("e.id = ?");
            params.push(filters.id);
        }
        if (filters.search) {
            where.push("e.title ILIKE ?");
            params.push(common.likeText(filters.search));
        }
        if (filters.category_id) {
            where.push("e.category_id = ?");
            params.push(filters.category_id);
        }
        // Events that run on any day of the range, so a multi-day event shows up on each of its days
        if (filters.from_date) {
            where.push(`${EVENT_LAST_DAY} >= CAST(? AS date)`);
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            where.push("e.event_date <= CAST(? AS date)");
            params.push(filters.to_date);
        }
        if (filters.upcoming_only) {
            where.push(`${EVENT_LAST_DAY} >= CURRENT_DATE`);
        }
        if (filters.with_poster) {
            where.push("e.poster_url IS NOT NULL AND e.poster_url != ''");
        }

        const whereSql = where.join(" AND ");
        // Members get title / description / venue in their language; the executive view keeps the original they edit
        const contentLang = executiveView ? null : lang;
        const { rows, pagination } = await query.fetchPage(
            `SELECT e.id, ${translatedColumns("event", "e", contentLang)},
                TO_CHAR(e.event_date, 'YYYY-MM-DD') AS event_date,
                TO_CHAR(e.end_date, 'YYYY-MM-DD') AS end_date,
                e.start_time, e.end_time, e.map_link, e.poster_url,
                e.organizer_name, e.contact_number, e.latitude, e.longitude, e.is_featured,
                COALESCE((SELECT json_agg(i.image_url ORDER BY i.sort_order, i.id) FROM event_images i
                          WHERE i.event_id = e.id), '[]'::json) AS images,
                c.id AS category_id, c.code AS category_code, c.name AS category_name, c.color AS category_color,
                CASE WHEN e.event_date > CURRENT_DATE THEN 'upcoming'
                     WHEN ${EVENT_LAST_DAY} >= CURRENT_DATE THEN 'ongoing'
                     ELSE 'completed' END AS event_status
                ${executiveView ? `, e.status, e.publish_at, e.posted_at, e.approved_by, e.approved_at, e.email_members,
                    e.created_by, cu.full_name AS created_by_name, e.created_at, e.updated_at` : ""}
             FROM events e
             JOIN event_categories c ON c.id = e.category_id
             ${translationJoin("event", "e", contentLang)}
             ${executiveView ? "LEFT JOIN users cu ON cu.id = e.created_by" : ""}
             WHERE ${whereSql}
             ORDER BY ${filters.featured_first ? "e.is_featured DESC, " : ""}${executiveView ? "e.updated_at DESC, e.id DESC" : `${EVENT_LAST_DAY} < CURRENT_DATE,
                CASE WHEN ${EVENT_LAST_DAY} >= CURRENT_DATE THEN e.event_date END ASC,
                e.event_date DESC, e.start_time ASC, e.id DESC`}`,
            `SELECT COUNT(*) AS total FROM events e WHERE ${whereSql}`,
            params,
            { page, limit, withTotal },
        );

        const events = rows.map(({ category_id, category_code, category_name, category_color, poster_url, images, ...event }) => ({
            ...event,
            poster_url: common.mediaUrl(poster_url),
            images: images.map((url) => common.mediaUrl(url)),
            category: { id: category_id, code: category_code, name: categoryName(lang, category_code, category_name), color: category_color },
        }));

        return { events, pagination };
    },

    // Shared by the home page, the notice board, the executive APIs and any other screen that lists notices
    // filters: { id, search, tag, from_date, to_date }
    // A notice for "selected" members is shown only to them and to the person who posted it.
    // A notice with a future published_at is hidden until then (scheduled)
    //   executiveView = true (executive / Super Admin): drafts and scheduled notices too, filters { status, created_by }, audience details
    async listNotices({ user_id, filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, lang = constant.DEFAULT_LANGUAGE, withTotal = true, executiveView = false }) {
        const where = ["n.is_active = 1", "n.is_deleted = 0"];
        const params = [];

        if (!executiveView) {
            where.push(
                "n.status = ?",
                "(n.published_at IS NULL OR n.published_at <= NOW())",
                `(n.audience = 'all' OR n.created_by = ?
                  OR EXISTS (SELECT 1 FROM notice_recipients r WHERE r.notice_id = n.id AND r.user_id = ?))`,
            );
            params.push(NOTICE_STATUS.PUBLISHED, user_id, user_id);
        } else if (filters.status) {
            where.push("n.status = ?");
            params.push(filters.status);
        }
        if (filters.created_by) {
            where.push("n.created_by = ?");
            params.push(filters.created_by);
        }
        if (filters.id) {
            where.push("n.id = ?");
            params.push(filters.id);
        }
        if (filters.search) {
            where.push("(n.title ILIKE ? OR n.body ILIKE ?)");
            params.push(common.likeText(filters.search), common.likeText(filters.search));
        }
        if (filters.tag) {
            where.push("n.tag = ?");
            params.push(filters.tag);
        }
        if (filters.from_date) {
            where.push(`CAST(${NOTICE_DATE} AS date) >= CAST(? AS date)`);
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            where.push(`CAST(${NOTICE_DATE} AS date) <= CAST(? AS date)`);
            params.push(filters.to_date);
        }

        const whereSql = where.join(" AND ");
        const { rows, pagination } = await query.fetchPage(
            executiveView
                ? `SELECT n.id, n.title, n.body, n.tag, n.event_id, n.status, n.audience, n.published_at, n.email_members,
                       (SELECT COUNT(*) FROM notice_recipients r WHERE r.notice_id = n.id) AS recipient_count,
                       n.created_by, cu.full_name AS created_by_name, n.created_at, n.updated_at
                   FROM notices n
                   LEFT JOIN users cu ON cu.id = n.created_by
                   WHERE ${whereSql}
                   ORDER BY n.updated_at DESC, n.id DESC`
                : `SELECT n.id, ${translatedColumns("notice", "n", lang)}, n.tag, n.event_id, ${NOTICE_DATE} AS published_at
                   FROM notices n
                   ${translationJoin("notice", "n", lang)}
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
                    // Featured events (set by the Super Admin) come first in the slider
                    filters: { upcoming_only: true, with_poster: true, featured_first: true },
                    limit: HOME_HERO_LIMIT,
                    lang: request.lang,
                    withTotal: false,
                }),
                this.listEvents({ filters: { upcoming_only: true }, limit: HOME_LIST_LIMIT, lang: request.lang, withTotal: false }),
                this.listNotices({ user_id: request.loginUser.id, limit: HOME_LIST_LIMIT, lang: request.lang, withTotal: false }),
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

    // One event in any status with the executive fields (status, publish_at, created_by…), or null
    async fullEvent(id, lang) {
        const { events } = await this.listEvents({ filters: { id }, limit: 1, lang, withTotal: false, executiveView: true });
        return events[0] || null;
    },

    // One notice in any status with its audience details (recipient_ids when "selected"), or null
    async fullNotice(id) {
        const { notices } = await this.listNotices({ filters: { id }, limit: 1, withTotal: false, executiveView: true });
        const notice = notices[0];
        if (!notice) return null;
        if (notice.audience === NOTICE_AUDIENCE.SELECTED) {
            const [rows] = await db.query("SELECT user_id FROM notice_recipients WHERE notice_id = ? ORDER BY user_id", [id]);
            notice.recipient_ids = rows.map((r) => r.user_id);
        }
        return notice;
    },

    // One events API for every role (the route allows member, executive, super_admin):
    //   no mine / status → the posted events everyone sees (members always get this; they can't send mine / status)
    //   executive / Super Admin with mine=true or status → their own events in any status ("My Events", drafts,
    //   Scheduled) with the executive fields. The Super Admin sees everyone's unless mine=true.
    // upcoming=true leaves out finished events (volunteer screen)
    async getEvents(request, res) {
        try {
            const { page, limit, upcoming, mine, status, manage, ...filters } = request.body;
            const user = request.loginUser;
            // manage=true: the management view (every status) without picking one, e.g. the admin panel's Events tab
            const executiveView = common.hasRole(user, CREATOR_ROLES) && Boolean(mine || status || manage);
            const ownOnly = mine || !common.hasRole(user, constant.SEE_ALL_ROLES);
            const data = await this.listEvents({
                filters: {
                    ...filters,
                    upcoming_only: upcoming,
                    ...(executiveView ? { status, created_by: ownOnly ? user.id : undefined } : {}),
                },
                page,
                limit,
                lang: request.lang,
                executiveView,
            });
            return middleware.sendSuccess(res, "rest_keywords_success", data);
        } catch (error) {
            return middleware.sendServerError(res, "getEvents", error);
        }
    },

    // One event. Its owner and the Super Admin get it in any status with the executive fields;
    // everyone else only a posted event. Drafts, deleted and other people's unposted events are "not found"
    async getEventDetails(request, res) {
        try {
            const id = routeId(request);
            if (!id) {
                return middleware.sendError(res, "rest_event_not_found");
            }
            if (common.hasRole(request.loginUser, CREATOR_ROLES)) {
                const event = await this.fullEvent(id, request.lang);
                if (event && common.canChange(request.loginUser, event.created_by)) {
                    return middleware.sendSuccess(res, "rest_keywords_success", { event });
                }
            }
            const { events } = await this.listEvents({ filters: { id }, limit: 1, lang: request.lang, withTotal: false });
            return events[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { event: events[0] })
                : middleware.sendError(res, "rest_event_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getEventDetails", error);
        }
    },

    // One notices API for every role, like getEvents:
    //   no mine / status → the notice board (published, audience rules)
    //   executive / Super Admin with mine=true or status → own notices in any status (Super Admin: everyone's
    //   unless mine=true), with status, audience, recipient_count
    async getNotices(request, res) {
        try {
            const { page, limit, mine, status, manage, ...filters } = request.body;
            const user = request.loginUser;
            const executiveView = common.hasRole(user, CREATOR_ROLES) && Boolean(mine || status || manage);
            const ownOnly = mine || !common.hasRole(user, constant.SEE_ALL_ROLES);
            const data = await this.listNotices({
                user_id: user.id,
                lang: request.lang,
                filters: { ...filters, ...(executiveView ? { status, created_by: ownOnly ? user.id : undefined } : {}) },
                page,
                limit,
                executiveView,
            });
            return middleware.sendSuccess(res, "rest_keywords_success", data);
        } catch (error) {
            return middleware.sendServerError(res, "getNotices", error);
        }
    },

    // One notice. Its owner and the Super Admin get it in any status with recipient_ids;
    // everyone else only what the notice board shows them
    async getNoticeDetails(request, res) {
        try {
            const id = routeId(request);
            if (!id) {
                return middleware.sendError(res, "rest_notice_not_found");
            }
            if (common.hasRole(request.loginUser, CREATOR_ROLES)) {
                const notice = await this.fullNotice(id);
                if (notice && common.canChange(request.loginUser, notice.created_by)) {
                    return middleware.sendSuccess(res, "rest_keywords_success", { notice });
                }
            }
            const { notices } = await this.listNotices({ user_id: request.loginUser.id, filters: { id }, limit: 1, lang: request.lang, withTotal: false });
            return notices[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { notice: notices[0] })
                : middleware.sendError(res, "rest_notice_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getNoticeDetails", error);
        }
    },

    // ---------- Gallery (files live on Cloudinary, the database keeps their links) ----------

    // Approved photos and videos for everyone, plus the user's own ones (pending / rejected, with the reason)
    // filters: see mediaWhere (id, category, event, type, search, dates). Newest first
    //   executiveView = true (moderation): every status (or filters.status), plus the moderation fields
    async listMedia({ user_id, filters = {}, page = 1, limit = constant.DEFAULT_PAGE_SIZE, lang = constant.DEFAULT_LANGUAGE, withTotal = true, executiveView = false }) {
        const { where, params } = mediaWhere({ user_id, filters, executiveView });
        const whereSql = where.join(" AND ");
        const { rows, pagination } = await query.fetchPage(
            `SELECT m.id, m.media_type, m.media_url, m.thumbnail_url, m.caption, m.status, m.rejection_reason,
                m.event_id, m.created_at, m.uploaded_by, u.full_name AS uploaded_by_name,
                ${executiveView ? "m.privacy, m.cloudinary_public_id, m.file_size_bytes, m.moderated_by, m.moderated_at," : ""}
                c.id AS category_id, c.code AS category_code, c.name AS category_name, c.color AS category_color
             ${MEDIA_FROM}
             WHERE ${whereSql}
             ORDER BY m.created_at DESC, m.id DESC`,
            `SELECT COUNT(*) AS total ${MEDIA_FROM} WHERE ${whereSql}`,
            params,
            { page, limit, withTotal },
        );

        const media = rows.map(({ category_id, category_code, category_name, category_color, uploaded_by, ...item }) => ({
            ...item,
            ...(executiveView ? { uploaded_by } : {}),
            is_mine: uploaded_by === user_id ? 1 : 0,
            category: { id: category_id, name: categoryName(lang, category_code, category_name), color: category_color },
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

            const settings = await common.getSettings();
            if (!settings.allow_uploads) {
                return middleware.sendError(res, "rest_uploads_closed");
            }
            // Executives / Super Admin always; members too when approval is switched off in the settings
            const approved = constant.MEDIA_AUTO_APPROVE_ROLES.includes(request.loginUser.role) || !settings.require_media_approval;
            const status = approved ? MEDIA_STATUS.APPROVED : MEDIA_STATUS.PENDING;
            const [result] = await query.insertQuery("media_items", {
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
            });

            if (!approved) common.notifyAdmins("notify_media_upload", "notify_admin_media_upload", caption || "", "media", result.insertId);
            return middleware.sendSuccess(res, approved ? "rest_media_saved" : "rest_media_pending", {
                media: { id: result.insertId, media_url, status },
            });
        } catch (error) {
            // category_id or event_id that doesn't exist
            if (error.code === DB_ERROR.FOREIGN_KEY_VIOLATION) {
                return middleware.sendError(res, error.constraint === "fk_media_event" ? "rest_event_not_found" : "rest_category_not_found");
            }
            return middleware.sendServerError(res, "saveMedia", error);
        }
    },

    // One gallery API for everyone (?page=&limit=&category_id=&event_id=&status=):
    //   no status → the gallery (approved items plus the user's own)
    //   status → the moderation view with the extra fields: the Super Admin gets everyone's items in that status
    //   (status=pending is the approval queue), others only their own
    async getMedia(request, res) {
        try {
            const user = request.loginUser;
            const { page, limit, status, manage, ...filters } = request.body;
            // manage=true: the moderation view of every status (the admin panel's "All" tab), like status=…
            const executiveView = Boolean(status || manage);
            const seeAll = common.hasPermission(user, "media"); // Super Admin, or an executive with Media
            const viewFilters = { ...filters, ...(executiveView ? { uploaded_by: seeAll ? undefined : user.id } : {}) };
            const [data, counts] = await Promise.all([
                this.listMedia({
                    user_id: user.id,
                    filters: { ...viewFilters, status },
                    page,
                    limit,
                    lang: request.lang,
                    executiveView,
                }),
                // The moderation view also counts its tabs (the same filters, without the status / type picked)
                executiveView ? this.countMedia({ user_id: user.id, filters: { ...viewFilters, media_type: undefined } }) : null,
            ]);
            return middleware.sendSuccess(res, "rest_keywords_success", counts ? { ...data, counts } : data);
        } catch (error) {
            return middleware.sendServerError(res, "getMedia", error);
        }
    },

    // Tab counts of the moderation view in one query: { all, photos, videos, pending, approved, rejected }
    async countMedia({ user_id, filters }) {
        const { where, params } = mediaWhere({ user_id, filters, executiveView: true });
        const [[row]] = await db.query(
            `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE m.media_type = 'photo') AS photos,
                COUNT(*) FILTER (WHERE m.media_type = 'video') AS videos,
                COUNT(*) FILTER (WHERE m.status = ?) AS pending,
                COUNT(*) FILTER (WHERE m.status = ?) AS approved,
                COUNT(*) FILTER (WHERE m.status = ?) AS rejected
             ${MEDIA_FROM} WHERE ${where.join(" AND ")}`,
            [MEDIA_STATUS.PENDING, MEDIA_STATUS.APPROVED, MEDIA_STATUS.REJECTED, ...params],
        );
        const { total, ...byTab } = row;
        return { all: total, ...byTab };
    },

    // One gallery item: the Super Admin gets any item in any status with the moderation fields;
    // others an approved item or their own
    async getMediaDetails(request, res) {
        try {
            const id = routeId(request);
            const executiveView = common.hasPermission(request.loginUser, "media");
            const { media } = id
                ? await this.listMedia({ user_id: request.loginUser.id, filters: { id }, limit: 1, lang: request.lang, withTotal: false, executiveView })
                : { media: [] };
            return media[0]
                ? middleware.sendSuccess(res, "rest_keywords_success", { media: media[0] })
                : middleware.sendError(res, "rest_media_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "getMediaDetails", error);
        }
    },

    // The uploader changes the caption, category or linked event of their own item (the file itself stays).
    // A member's edited item goes back to "pending" for the Super Admin to approve again
    async editMedia(request, res) {
        try {
            const user_id = request.loginUser.id;
            const id = routeId(request);
            const item = id ? await findMedia(id) : null;
            if (!item) {
                return middleware.sendError(res, "rest_media_not_found");
            }
            if (item.uploaded_by !== user_id) {
                return middleware.sendForbidden(res);
            }

            const approved = constant.MEDIA_AUTO_APPROVE_ROLES.includes(request.loginUser.role)
                || !(await common.getSettings()).require_media_approval;
            const { caption, category_id, event_id } = request.body;
            const changes = {
                ...(caption !== undefined ? { caption: caption || null } : {}),
                ...(category_id !== undefined ? { category_id } : {}),
                ...(event_id !== undefined ? { event_id } : {}),
                ...(approved ? {} : { status: MEDIA_STATUS.PENDING, moderated_by: null, moderated_at: null, rejection_reason: null }),
            };
            await query.updateQuery("media_items", changes, "id = ?", [id]);

            const { media } = await this.listMedia({ user_id, filters: { id }, limit: 1, lang: request.lang, withTotal: false });
            return middleware.sendSuccess(res, approved ? "rest_media_updated" : "rest_media_pending", { media: media[0] });
        } catch (error) {
            if (error.code === DB_ERROR.FOREIGN_KEY_VIOLATION) {
                return middleware.sendError(res, error.constraint === "fk_media_event" ? "rest_event_not_found" : "rest_category_not_found");
            }
            return middleware.sendServerError(res, "editMedia", error);
        }
    },

    // Removes an item from the gallery (soft delete): the uploader, or the Super Admin. The file stays in Cloudinary
    async deleteMedia(request, res) {
        try {
            const id = routeId(request);
            const item = id ? await findMedia(id) : null;
            if (!item) {
                return middleware.sendError(res, "rest_media_not_found");
            }
            if (!common.canChange(request.loginUser, item.uploaded_by)) {
                return middleware.sendForbidden(res);
            }

            await query.updateQuery("media_items", { is_deleted: 1 }, "id = ?", [id]);
            return middleware.sendSuccess(res, "rest_media_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "deleteMedia", error);
        }
    },

    // For the category filter on the events page, in the app's language
    async getEventCategories(request, res) {
        try {
            const [rows] = await db.query(
                `SELECT id, code, name, color FROM event_categories
                 WHERE is_active = 1 AND is_deleted = 0
                 ORDER BY sort_order, id`,
            );
            const categories = rows.map((c) => ({ ...c, name: categoryName(request.lang, c.code, c.name) }));
            return middleware.sendSuccess(res, "rest_keywords_success", { categories });
        } catch (error) {
            return middleware.sendServerError(res, "getEventCategories", error);
        }
    },

    // ---------- Notifications ----------

    // The user's notifications, newest first, with the unread count for the bell badge. ?type=event|notice|donation|general
    // System titles are language keys (notify_*), translated here
    async getNotifications(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { page, limit, type } = request.body;
            const where = ["r.user_id = ?", "n.is_deleted = 0", "n.is_active = 1"];
            const params = [user_id];
            if (type) {
                where.push("n.type = ?");
                params.push(type);
            }
            const whereSql = where.join(" AND ");

            const [[rows], [[counts]]] = await Promise.all([
                db.query(
                    `SELECT r.id AS recipient_id, n.id, n.type, n.priority,
                        -- "New event / notice" notifications carry the item's title: show its translation.
                        -- System ones (notify_* keys) are translated from the language files below
                        CASE WHEN n.title LIKE 'notify\\_%' THEN n.title ELSE COALESCE(tt.value, n.title) END AS title,
                        CASE WHEN n.ref_type = 'notice' THEN COALESCE(tb.value, n.body) ELSE n.body END AS body,
                        n.ref_type, n.ref_id, n.created_at, r.read_at
                     FROM notification_recipients r
                     JOIN notifications n ON n.id = r.notification_id
                     LEFT JOIN content_translations tt ON tt.entity_type = n.ref_type AND tt.entity_id = n.ref_id
                          AND tt.lang = ? AND tt.field = 'title'
                     LEFT JOIN content_translations tb ON tb.entity_type = n.ref_type AND tb.entity_id = n.ref_id
                          AND tb.lang = ? AND tb.field = 'body'
                     WHERE ${whereSql}
                     ORDER BY n.created_at DESC, n.id DESC
                     LIMIT ? OFFSET ?`,
                    [request.lang, request.lang, ...params, limit, (page - 1) * limit],
                ),
                db.query(
                    `SELECT COUNT(*) AS total,
                        (SELECT COUNT(*) FROM notification_recipients r2 JOIN notifications n2 ON n2.id = r2.notification_id
                         WHERE r2.user_id = ? AND r2.read_at IS NULL AND n2.is_deleted = 0 AND n2.is_active = 1) AS unread
                     FROM notification_recipients r JOIN notifications n ON n.id = r.notification_id
                     WHERE ${whereSql}`,
                    [user_id, ...params],
                ),
            ]);

            const notifications = rows.map(({ recipient_id, read_at, title, ...n }) => ({
                ...n,
                title: common.translate(request.lang, title, title),
                is_read: read_at ? 1 : 0,
                read_at,
            }));
            return middleware.sendSuccess(res, "rest_keywords_success", {
                notifications,
                unread_count: counts.unread,
                pagination: pageInfo(page, limit, counts.total),
            });
        } catch (error) {
            return middleware.sendServerError(res, "getNotifications", error);
        }
    },

    // :id = the notification id (only the user's own copy is touched)
    async readNotification(request, res) {
        try {
            const id = routeId(request);
            const [result] = id
                ? await db.query(
                    "UPDATE notification_recipients SET read_at = COALESCE(read_at, NOW()) WHERE notification_id = ? AND user_id = ?",
                    [id, request.loginUser.id],
                )
                : [{ affectedRows: 0 }];
            return result.affectedRows
                ? middleware.sendSuccess(res, "rest_keywords_success")
                : middleware.sendError(res, "rest_notification_not_found");
        } catch (error) {
            return middleware.sendServerError(res, "readNotification", error);
        }
    },

    async readAllNotifications(request, res) {
        try {
            await db.query("UPDATE notification_recipients SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL", [request.loginUser.id]);
            return middleware.sendSuccess(res, "rest_keywords_success");
        } catch (error) {
            return middleware.sendServerError(res, "readAllNotifications", error);
        }
    },

    // ---------- Member directory ----------

    // Members who finished sign-up and haven't hidden themselves (user_profiles.directory_visible).
    // Mobile / email: shown when the member allows it (mobile_visible / email_visible), to themselves,
    // and always to CONTACT_VISIBLE_ROLES. ?search= (name or member code) &role=
    async getMembers(request, res) {
        try {
            const viewer = request.loginUser;
            const { page, limit, search, role } = request.body;
            const where = [
                "u.is_deleted = 0", "u.is_active = 1", "u.status = 'active'", "u.signup_step = 'completed'",
                "COALESCE(p.directory_visible, 1) = 1", "r.code = ANY(?::text[])",
            ];
            const params = [role ? [role] : constant.DIRECTORY_ROLES];
            if (search) {
                where.push("(u.full_name ILIKE ? OR u.member_code ILIKE ?)");
                const like = common.likeText(search);
                params.push(like, like);
            }
            const whereSql = where.join(" AND ");
            const from = `FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN user_profiles p ON p.user_id = u.id WHERE ${whereSql}`;

            const [[rows], [[count]]] = await Promise.all([
                db.query(
                    `SELECT u.id, u.full_name, u.member_code, r.code AS role, u.country_code, u.mobile, u.email, p.photo_url,
                        COALESCE(p.mobile_visible, 0) AS mobile_visible, COALESCE(p.email_visible, 0) AS email_visible
                     ${from}
                     ORDER BY u.full_name, u.id LIMIT ? OFFSET ?`,
                    [...params, limit, (page - 1) * limit],
                ),
                db.query(`SELECT COUNT(*) AS total ${from}`, params),
            ]);

            const seesAll = common.hasRole(viewer, constant.CONTACT_VISIBLE_ROLES);
            const members = rows.map((m) => {
                const self = m.id === viewer.id;
                return {
                    id: m.id,
                    name: m.full_name,
                    member_code: m.member_code,
                    role: m.role,
                    photo_url: common.mediaUrl(m.photo_url),
                    mobile: seesAll || self || m.mobile_visible ? `${m.country_code} ${m.mobile}` : null,
                    email: seesAll || self || m.email_visible ? m.email : null,
                };
            });
            return middleware.sendSuccess(res, "rest_keywords_success", { members, pagination: pageInfo(page, limit, count.total) });
        } catch (error) {
            return middleware.sendServerError(res, "getMembers", error);
        }
    },

    // ---------- Donations ----------

    // What the Donate screen needs: the society's UPI details (null until the admin adds them) and the limits
    // GET /user/app-info: the society's details and social links (App Settings), for the app's menu and About
    async getAppInfo(request, res) {
        try {
            const settings = await common.getSettings();
            const social_links = constant.SOCIAL_NETWORKS
                .map((network) => ({ network, url: settings.social_links?.[network] || "" }))
                .filter((link) => link.url);
            return middleware.sendSuccess(res, "rest_keywords_success", {
                society_name: settings.society_name,
                society_name_gu: settings.society_name_gu,
                show_gujarati_name: settings.show_gujarati_name,
                notice_tags: settings.notice_tags, // the notice categories (Post Notice, notice board filter)
                contact_email: settings.contact_email,
                phone: settings.phone,
                address: settings.address,
                logo_url: common.mediaUrl(settings.logo_url),
                social_links,
            });
        } catch (error) {
            return middleware.sendServerError(res, "getAppInfo", error);
        }
    },

    // ---------- Notification settings (the app's Settings → Notifications) ----------

    // GET /user/notification-settings: { settings: { events, notices, payments } } (true = delivered, the default)
    async getNotificationSettings(request, res) {
        try {
            const [rows] = await db.query(
                "SELECT notify_events, notify_notices, notify_payments FROM user_profiles WHERE user_id = ?",
                [request.loginUser.id],
            );
            const p = rows[0] ?? { notify_events: 1, notify_notices: 1, notify_payments: 1 };
            return middleware.sendSuccess(res, "rest_keywords_success", {
                settings: { events: p.notify_events === 1, notices: p.notify_notices === 1, payments: p.notify_payments === 1 },
            });
        } catch (error) {
            return middleware.sendServerError(res, "getNotificationSettings", error);
        }
    },

    // PUT /user/notification-settings: only the switches sent. A switched-off type is no longer delivered to this
    // user (common.sendNotification); general notices from the society (role changes…) always are
    async saveNotificationSettings(request, res) {
        try {
            const { events, notices, payments } = request.body;
            const changes = {
                ...(events !== undefined ? { notify_events: events ? 1 : 0 } : {}),
                ...(notices !== undefined ? { notify_notices: notices ? 1 : 0 } : {}),
                ...(payments !== undefined ? { notify_payments: payments ? 1 : 0 } : {}),
            };
            await query.upsertQuery("user_profiles", { user_id: request.loginUser.id, ...changes }, ["user_id"]);
            return this.getNotificationSettings(request, res);
        } catch (error) {
            return middleware.sendServerError(res, "saveNotificationSettings", error);
        }
    },

    async getDonationSettings(request, res) {
        try {
            const [rows] = await db.query(
                `SELECT payee_name, upi_id, qr_image_url, display_note FROM upi_settings
                 WHERE is_active = 1 AND is_deleted = 0 ORDER BY id DESC LIMIT 1`,
            );
            const upi = rows[0] ? { ...rows[0], qr_image_url: common.mediaUrl(rows[0].qr_image_url) } : null;
            const settings = await common.getSettings();
            return middleware.sendSuccess(res, "rest_keywords_success", {
                upi,
                purposes: settings.donation_purposes,
                methods: constant.MEMBER_DONATION_METHODS,
                min_amount: constant.DONATION_MIN_AMOUNT,
                max_amount: constant.DONATION_MAX_AMOUNT,
                executive_min_donation: settings.executive_min_donation,
            });
        } catch (error) {
            return middleware.sendServerError(res, "getDonationSettings", error);
        }
    },

    // POST /user/donations. UPI (app / QR): saved "pending" without a UTR before the member pays, so its receipt
    // number (DON042) goes in the UPI note; the UTR follows with PUT /donations/:id/payment. Going back and forth on the
    // Donate screen reuses the same unpaid donation (same amount and purpose). Cash: paid at the office later.
    // Older app builds send the UTR here straight away. Either way it stays "pending" until the treasurer matches it
    // with the bank statement or the cash book
    async createDonation(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { amount, purpose, method, reference_no } = request.body;
            if (!(await common.getSettings()).donation_purposes.includes(purpose)) {
                return middleware.sendError(res, "rest_donation_purpose_invalid");
            }
            const isUpi = UPI_METHODS.includes(method);
            const unpaid = isUpi && !reference_no;
            if (unpaid) {
                const [[open]] = await db.query(
                    `SELECT id FROM donations
                     WHERE donor_user_id = ? AND amount = ? AND purpose = ? AND status = ? AND reference_no IS NULL
                       AND method = ANY(?::text[]) AND entered_by IS NULL AND is_deleted = 0
                       AND created_at > NOW() - make_interval(hours => ?::int)
                     ORDER BY id DESC LIMIT 1`,
                    [user_id, amount, purpose, DONATION_STATUS.PENDING, UPI_METHODS, constant.DONATION_UNPAID_KEEP_HOURS],
                );
                if (open) {
                    return middleware.sendSuccess(res, "rest_donation_started", { donation: await userModule.findDonation(open.id, user_id) });
                }
            }
            const [result] = await query.insertQuery("donations", {
                donor_user_id: user_id,
                amount,
                purpose,
                method,
                status: DONATION_STATUS.PENDING,
                reference_no: isUpi ? reference_no || null : null,
            });
            // The treasurer is told once there is something to check: a UTR, or a cash promise
            if (!unpaid) userModule.notifyDonationToVerify(amount, purpose, result.insertId);
            const donation = await userModule.findDonation(result.insertId, user_id);
            return middleware.sendSuccess(res, unpaid ? "rest_donation_started" : "rest_donation_recorded", { donation });
        } catch (error) {
            if (error.code === DB_ERROR.UNIQUE_VIOLATION && error.constraint === "uq_donations_upi_reference") {
                return middleware.sendError(res, "rest_donation_reference_used");
            }
            return middleware.sendServerError(res, "createDonation", error);
        }
    },

    // PUT /user/donations/:id/payment: after paying by UPI, the member's own unpaid donation gets the UTR, the UPI way
    // used (app / QR) and an optional screenshot. Only once: after that the treasurer verifies or rejects it
    async submitDonationPayment(request, res) {
        try {
            const user_id = request.loginUser.id;
            const id = routeId(request);
            const { reference_no, method, proof_url } = request.body;
            if (proof_url && !common.isInMediaFolder(proof_url, "proof", user_id)) {
                return middleware.sendError(res, "rest_invalid_media_folder");
            }
            const [result] = id
                ? await query.updateQuery(
                    "donations",
                    { reference_no, proof_url: proof_url || null, ...(method ? { method } : {}) },
                    `id = ? AND donor_user_id = ? AND status = ? AND reference_no IS NULL AND method = ANY(?::text[])
                     AND entered_by IS NULL AND is_deleted = 0`,
                    [id, user_id, DONATION_STATUS.PENDING, UPI_METHODS],
                )
                : [{ affectedRows: 0 }];
            const donation = id ? await userModule.findDonation(id, user_id) : null;
            if (!result.affectedRows) {
                return middleware.sendError(res, donation ? "rest_donation_payment_already_sent" : "rest_donation_not_found");
            }
            userModule.notifyDonationToVerify(donation.amount, donation.purpose, id);
            return middleware.sendSuccess(res, "rest_donation_recorded", { donation });
        } catch (error) {
            if (error.code === DB_ERROR.UNIQUE_VIOLATION && error.constraint === "uq_donations_upi_reference") {
                return middleware.sendError(res, "rest_donation_reference_used");
            }
            return middleware.sendServerError(res, "submitDonationPayment", error);
        }
    },

    // The Super Admins' "new donation to verify" alert (App Settings -> notify_donation). Not awaited, never throws
    notifyDonationToVerify(amount, purpose, donation_id) {
        common.notifyAdmins("notify_donation", "notify_admin_donation", `₹${Number(amount).toLocaleString("en-IN")} · ${purpose}`, "donation", donation_id);
    },

    async findDonation(id, donor_user_id) {
        const [rows] = await db.query(
            `SELECT id, amount, purpose, method, status, reference_no, proof_url, note,
                TO_CHAR(donated_on, 'YYYY-MM-DD') AS donated_on, created_at, confirmed_at
             FROM donations WHERE id = ? AND donor_user_id = ? AND is_deleted = 0`,
            [id, donor_user_id],
        );
        return rows[0] ? { ...rows[0], amount: money(rows[0].amount), proof_url: common.mediaUrl(rows[0].proof_url) } : null;
    },

    // The member's donations, newest first. summary counts confirmed (success) donations only
    async getMyDonations(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { page, limit } = request.body;
            const [[rows], [[summary]]] = await Promise.all([
                db.query(
                    `SELECT id, amount, purpose, method, status, reference_no, proof_url, note,
                        TO_CHAR(donated_on, 'YYYY-MM-DD') AS donated_on, created_at, confirmed_at
                     FROM donations WHERE donor_user_id = ? AND is_deleted = 0
                     ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
                    [user_id, limit, (page - 1) * limit],
                ),
                db.query(
                    `SELECT COUNT(*) AS count,
                        COALESCE(SUM(amount) FILTER (WHERE status = ?), 0) AS total,
                        COALESCE(SUM(amount) FILTER (WHERE status = ?
                            AND EXTRACT(YEAR FROM donated_on) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS this_year
                     FROM donations WHERE donor_user_id = ? AND is_deleted = 0`,
                    [DONATION_STATUS.SUCCESS, DONATION_STATUS.SUCCESS, user_id],
                ),
            ]);
            return middleware.sendSuccess(res, "rest_keywords_success", {
                donations: rows.map((d) => ({ ...d, amount: money(d.amount), proof_url: common.mediaUrl(d.proof_url) })),
                summary: { total: money(summary.total), this_year: money(summary.this_year) },
                pagination: pageInfo(page, limit, summary.count),
            });
        } catch (error) {
            return middleware.sendServerError(res, "getMyDonations", error);
        }
    },

    // ---------- Executive Request ----------

    // The user's latest request, or null
    async latestApplication(user_id) {
        const [rows] = await db.query(
            `SELECT id, status, donation_amount, reference_no, reason, payment_proof_url, review_note, created_at, reviewed_at
             FROM executive_applications WHERE user_id = ? AND is_deleted = 0
             ORDER BY created_at DESC, id DESC LIMIT 1`,
            [user_id],
        );
        return rows[0]
            ? { ...rows[0], donation_amount: money(rows[0].donation_amount), payment_proof_url: common.mediaUrl(rows[0].payment_proof_url) }
            : null;
    },

    // The user's latest request (null if none) and the minimum donation
    async getExecutiveRequest(request, res) {
        try {
            return middleware.sendSuccess(res, "rest_keywords_success", {
                application: await userModule.latestApplication(request.loginUser.id),
                executive_min_donation: (await common.getSettings()).executive_min_donation,
            });
        } catch (error) {
            return middleware.sendServerError(res, "getExecutiveRequest", error);
        }
    },

    // A member asks to become an executive. One open (pending) request at a time. The donation is linked when
    // reference_no matches one of the member's donations. The proof file is uploaded by the app to Cloudinary
    async createExecutiveRequest(request, res) {
        try {
            const user_id = request.loginUser.id;
            const { donation_amount, reference_no, reason, payment_proof_url } = request.body;

            if (payment_proof_url && !common.isInMediaFolder(payment_proof_url, "proof", user_id)) {
                return middleware.sendError(res, "rest_invalid_media_folder");
            }
            const { executive_min_donation } = await common.getSettings();
            if (donation_amount < executive_min_donation) {
                return middleware.sendError(res, "rest_executive_donation_too_low", { executive_min_donation });
            }

            const [[pending], [donations]] = await Promise.all([
                db.query("SELECT 1 FROM executive_applications WHERE user_id = ? AND status = ? AND is_deleted = 0 LIMIT 1",
                    [user_id, EXEC_APPLICATION_STATUS.PENDING]),
                db.query("SELECT id FROM donations WHERE donor_user_id = ? AND reference_no = ? AND is_deleted = 0 LIMIT 1",
                    [user_id, reference_no]),
            ]);
            if (pending.length) {
                return middleware.sendError(res, "rest_executive_request_pending");
            }

            const [saved] = await query.insertQuery("executive_applications", {
                user_id,
                donation_id: donations[0]?.id ?? null,
                donation_amount,
                reference_no,
                reason,
                payment_proof_url: payment_proof_url || null,
                status: EXEC_APPLICATION_STATUS.PENDING,
            });
            common.notifyAdmins("notify_executive_request", "notify_admin_executive_request", request.loginUser.name || "", "executive_request", saved.insertId);
            return middleware.sendSuccess(res, "rest_executive_request_sent", {
                application: await userModule.latestApplication(user_id),
                executive_min_donation,
            });
        } catch (error) {
            return middleware.sendServerError(res, "createExecutiveRequest", error);
        }
    },
};

export default userModule;
