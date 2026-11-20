import db from "../../../config/db.js";
import query from "../../../config/dbHelper.js";
import constant from "../../../config/constant.js";
import common from "../../../config/common.js";
import middleware from "../../../middleware/middleware.js";
import userModule from "./userModule.js";

// Creating, editing, deleting and approving events / notices, and gallery moderation (routes: /api/v1/executive).
// Who may call each API is checked in executiveRoute.js (middleware.allowedRoles) before this runs.
// Here only the owner check (needs the row) and role-based behaviour (from req.loginUser, no query) remain.
// Listing / details are NOT here: everyone uses GET /user/events and /user/notices (mine / status for executives)
const {
    EVENT_STATUS, NOTICE_STATUS, MEDIA_STATUS, EVENT_ACTIONS, NOTICE_ACTIONS, REVIEW_ACTIONS,
    NOTICE_AUDIENCE, DB_ERROR, ACTIVITY, EVENT_PLAN_STATUS,
} = constant;
const { routeId } = common;

const findRow = async (table, id, ownerColumn = "created_by") => {
    const [rows] = await db.query(`SELECT id, status, ${ownerColumn} AS owner_id FROM ${table} WHERE id = ? AND is_deleted = 0`, [id]);
    return rows[0] || null;
};

// Foreign keys that point at something missing → a message the user understands
const sendSaveError = (res, where, error) => {
    if (error.code === DB_ERROR.FOREIGN_KEY_VIOLATION) {
        return middleware.sendError(res, error.constraint === "fk_events_category" ? "rest_category_not_found" : "rest_event_not_found");
    }
    if (error.code === "NOTICE_NO_RECIPIENTS") {
        return middleware.sendError(res, "rest_notice_recipients_invalid");
    }
    return middleware.sendServerError(res, where, error);
};

// Edit / delete: the owner or the Super Admin. Returns the row, or sends the error and returns null
const findOwnRow = async (request, res, table, notFoundKey) => {
    const id = routeId(request);
    const row = id ? await findRow(table, id) : null;
    if (!row) {
        middleware.sendError(res, notFoundKey);
        return null;
    }
    if (!common.canChange(request.loginUser, row.owner_id)) {
        middleware.sendForbidden(res);
        return null;
    }
    return row;
};

// ---------- Events ----------

const EVENT_STATUS_MESSAGE = {
    [EVENT_STATUS.DRAFT]: "rest_event_draft_saved",
    [EVENT_STATUS.SCHEDULED]: "rest_event_scheduled",
    [EVENT_STATUS.POSTED]: "rest_event_posted",
};

// Status columns for what the creator asked: draft (hidden), post (live now) or schedule (live at publish_at).
// Events need no approval: whoever may create them publishes them
const eventStatusFields = (action, publishAt, user_id) => {
    const now = new Date();
    if (action === EVENT_ACTIONS.DRAFT) {
        return { status: EVENT_STATUS.DRAFT, publish_at: null, posted_at: null, approved_by: null, approved_at: null };
    }
    return action === EVENT_ACTIONS.SCHEDULE
        ? { status: EVENT_STATUS.SCHEDULED, publish_at: publishAt, posted_at: null, approved_by: user_id, approved_at: now }
        : { status: EVENT_STATUS.POSTED, publish_at: null, posted_at: now, approved_by: user_id, approved_at: now };
};

// The event columns from a validated body ("" becomes null)
const eventFields = (body) => {
    const fields = {};
    for (const column of ["category_id", "title", "description", "event_date", "end_date", "start_time", "end_time",
        "venue_name", "venue_address", "map_link", "poster_url", "organizer_name", "contact_number", "latitude", "longitude"]) {
        fields[column] = body[column] === "" || body[column] === undefined ? null : body[column];
    }
    return fields;
};

// Shared by create and edit: image folder check, status from the action, then the event and its images
// are saved together (an edit replaces the image list)
const saveEvent = async (request, res, existingId = null) => {
    const user = request.loginUser;
    const body = request.body;
    const images = body.images ?? [];

    // Posters and event images are uploaded by the app to society_app/<env>/events/<yyyy>/<mm>/ (MEDIA_FOLDERS.event)
    if ([body.poster_url, ...images].some((url) => url && !common.isInMediaFolder(url, "event", user.id))) {
        return middleware.sendError(res, "rest_invalid_media_folder");
    }

    // A new event made from an Event Planning plan: the plan must be the user's own (or any, for the Super Admin)
    const planId = existingId ? null : body.plan_id;
    if (planId) {
        const plan = await findRow("future_event_plans", planId);
        if (!plan || !common.canChange(user, plan.owner_id)) return middleware.sendError(res, "rest_event_plan_not_found");
    }

    const data = { ...eventFields(body), ...eventStatusFields(body.action, body.publish_at, user.id) };
    // No separate cover: the first image is the poster (home slider, list cards)
    data.poster_url = data.poster_url ?? images[0] ?? null;

    const id = await db.transaction(async (tx) => {
        let eventId = existingId;
        if (existingId) {
            await query.updateQuery("events", data, "id = ?", [existingId], tx);
            await tx.query("DELETE FROM event_images WHERE event_id = ?", [existingId]);
        } else {
            const [result] = await query.insertQuery("events", { ...data, created_by: user.id }, "", tx);
            eventId = result.insertId;
            if (planId) {
                await query.updateQuery("future_event_plans", { status: EVENT_PLAN_STATUS.CONVERTED, converted_event_id: eventId }, "id = ?", [planId], tx);
            }
        }
        if (images.length) {
            await tx.query(
                `INSERT INTO event_images (event_id, image_url, sort_order)
                 SELECT ?, url, ord - 1 FROM unnest(?::text[]) WITH ORDINALITY AS t(url, ord)`,
                [eventId, images],
            );
        }
        return eventId;
    });

    common.notifyNewContent(); // a posted event is announced now instead of at the next cron run
    common.logActivity(request, existingId ? ACTIVITY.EVENT_UPDATED : ACTIVITY.EVENT_CREATED, "events", id);
    return middleware.sendSuccess(res, EVENT_STATUS_MESSAGE[data.status], { event: await userModule.fullEvent(id, request.lang) });
};

// ---------- Notices ----------

// Saves the notice and (for audience "selected") its recipient list together. Recipients that aren't active
// users are skipped; none left → NOTICE_NO_RECIPIENTS and nothing is saved
const saveNoticeRows = (data, recipientIds, existingId, user_id) => db.transaction(async (tx) => {
    let id = existingId;
    if (existingId) {
        await query.updateQuery("notices", data, "id = ?", [existingId], tx);
        await tx.query("DELETE FROM notice_recipients WHERE notice_id = ?", [existingId]);
    } else {
        const [result] = await query.insertQuery("notices", { ...data, created_by: user_id }, "", tx);
        id = result.insertId;
    }

    if (data.audience === NOTICE_AUDIENCE.SELECTED) {
        const [added] = await tx.query(
            `INSERT INTO notice_recipients (notice_id, user_id)
             SELECT ?, id FROM users WHERE id = ANY(?::bigint[]) AND is_deleted = 0 AND is_active = 1
             ON CONFLICT DO NOTHING`,
            [id, recipientIds],
        );
        if (added.affectedRows === 0) {
            throw Object.assign(new Error("No valid notice recipients"), { code: "NOTICE_NO_RECIPIENTS" });
        }
    }
    return id;
});

const saveNotice = async (request, res, existingId = null) => {
    const { title, body, tag, event_id, audience, recipient_ids, action, publish_at } = request.body;
    const publishing = action === NOTICE_ACTIONS.PUBLISH;
    const data = {
        title,
        body,
        tag,
        event_id: event_id ?? null,
        audience,
        status: publishing ? NOTICE_STATUS.PUBLISHED : NOTICE_STATUS.DRAFT,
        // A future time = scheduled: the notice board shows it from then on
        published_at: publishing ? (publish_at ?? new Date()) : null,
    };

    const id = await saveNoticeRows(data, recipient_ids ?? [], existingId, request.loginUser.id);
    common.notifyNewContent(); // a notice published now is announced now (a scheduled one by the cron)
    common.logActivity(request, existingId ? ACTIVITY.NOTICE_UPDATED : ACTIVITY.NOTICE_CREATED, "notices", id);
    const msgKey = !publishing ? "rest_notice_draft_saved" : publish_at ? "rest_notice_scheduled" : "rest_notice_published";
    return middleware.sendSuccess(res, msgKey, { notice: await userModule.fullNotice(id) });
};

// ---------- Roles ----------

// Gives `user_id` the role `roleCode` (member / executive) and tells them. Inside a transaction when `conn` is a tx
const changeRole = async (user_id, roleCode, admin_id, conn = db) => {
    await conn.query("UPDATE users SET role_id = (SELECT id FROM roles WHERE code = ?) WHERE id = ?", [roleCode, user_id]);
    // Their tokens were issued for the old role: end those sessions (they log in again with the new role)
    await query.updateQuery("user_devices", constant.LOGGED_OUT_DEVICE, "user_id = ? AND status = 'active'", [user_id], conn);
    // Executive permissions: the default sections for a new executive, none for a member
    const executive = roleCode === constant.ROLES.EXECUTIVE;
    await common.savePermissions(user_id, executive ? constant.DEFAULT_EXECUTIVE_SECTIONS : [], admin_id, conn);
    return () => common.sendNotification({
        sender_id: admin_id,
        receiver_ids: [user_id],
        type: constant.NOTIFICATION_TYPE.GENERAL,
        title: roleCode === constant.ROLES.EXECUTIVE ? "notify_role_executive" : "notify_role_member",
    });
};

// Event status set by the Super Admin from the panel: posted (live now), draft (hidden) or cancelled
const EVENT_STATUS_COLUMNS = {
    [EVENT_STATUS.POSTED]: (admin_id) => ({
        status: EVENT_STATUS.POSTED, publish_at: null, posted_at: new Date(), approved_by: admin_id, approved_at: new Date(),
    }),
    [EVENT_STATUS.DRAFT]: () => ({ status: EVENT_STATUS.DRAFT, publish_at: null, posted_at: null }),
    [EVENT_STATUS.CANCELLED]: () => ({ status: EVENT_STATUS.CANCELLED }),
};

const pageInfo = (page, limit, total) => ({ page, limit, total, total_pages: Math.ceil(total / limit), has_more: page * limit < total });

const executiveModule = {
    // ---------- Events ----------

    async createEvent(request, res) {
        try {
            return await saveEvent(request, res);
        } catch (error) {
            return sendSaveError(res, "createEvent", error);
        }
    },

    // The whole event is sent again with an action (draft / post / schedule)
    async updateEvent(request, res) {
        try {
            const event = await findOwnRow(request, res, "events", "rest_event_not_found");
            return event ? await saveEvent(request, res, event.id) : undefined;
        } catch (error) {
            return sendSaveError(res, "updateEvent", error);
        }
    },

    async deleteEvent(request, res) {
        try {
            const event = await findOwnRow(request, res, "events", "rest_event_not_found");
            if (!event) return undefined;
            await query.updateQuery("events", { is_deleted: 1 }, "id = ?", [event.id]);
            common.logActivity(request, ACTIVITY.EVENT_DELETED, "events", event.id);
            return middleware.sendSuccess(res, "rest_event_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "deleteEvent", error);
        }
    },

    // ---------- Notices ----------

    async createNotice(request, res) {
        try {
            return await saveNotice(request, res);
        } catch (error) {
            return sendSaveError(res, "createNotice", error);
        }
    },

    // The whole notice is sent again; the recipient list is replaced
    async updateNotice(request, res) {
        try {
            const notice = await findOwnRow(request, res, "notices", "rest_notice_not_found");
            return notice ? await saveNotice(request, res, notice.id) : undefined;
        } catch (error) {
            return sendSaveError(res, "updateNotice", error);
        }
    },

    async deleteNotice(request, res) {
        try {
            const notice = await findOwnRow(request, res, "notices", "rest_notice_not_found");
            if (!notice) return undefined;
            await query.updateQuery("notices", { is_deleted: 1 }, "id = ?", [notice.id]);
            common.logActivity(request, ACTIVITY.NOTICE_DELETED, "notices", notice.id);
            return middleware.sendSuccess(res, "rest_notice_deleted");
        } catch (error) {
            return middleware.sendServerError(res, "deleteNotice", error);
        }
    },

    // ---------- Gallery moderation (Super Admin only: checked in the route) ----------
    // The list is the shared GET /user/media with status (userModule.getMedia)

    // Approve (shown in the gallery) or reject (hidden; the uploader sees the reason). Works on any status,
    // so an approved photo can be taken down later
    async reviewMedia(request, res) {
        try {
            const id = routeId(request);
            const item = id ? await findRow("media_items", id, "uploaded_by") : null;
            if (!item) {
                return middleware.sendError(res, "rest_media_not_found");
            }

            const { action, reason } = request.body;
            const approving = action === REVIEW_ACTIONS.APPROVE;
            await query.updateQuery("media_items", {
                status: approving ? MEDIA_STATUS.APPROVED : MEDIA_STATUS.REJECTED,
                rejection_reason: approving ? null : reason,
                moderated_by: request.loginUser.id,
                moderated_at: new Date(),
            }, "id = ?", [id]);

            const { media } = await userModule.listMedia({
                user_id: request.loginUser.id, filters: { id }, limit: 1, lang: request.lang, withTotal: false, executiveView: true,
            });
            common.sendNotification({
                sender_id: request.loginUser.id,
                receiver_ids: [item.owner_id],
                type: constant.NOTIFICATION_TYPE.GENERAL,
                title: approving ? "notify_media_approved" : "notify_media_rejected",
                message: approving ? (media[0]?.caption ?? "") : reason,
                ref_type: "media",
                ref_id: id,
            });
            common.logActivity(request, approving ? ACTIVITY.MEDIA_APPROVED : ACTIVITY.MEDIA_REJECTED, "media_items", id);
            return middleware.sendSuccess(res, approving ? "rest_media_approved" : "rest_media_rejected", { media: media[0] });
        } catch (error) {
            return middleware.sendServerError(res, "reviewMedia", error);
        }
    },
};

executiveModule.setMemberRole = async (request, res) => {
    try {
        const id = routeId(request);
        const { role } = request.body;
        const [rows] = id
            ? await db.query(
                `SELECT u.id, u.status, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE u.id = ? AND u.is_deleted = 0`,
                [id],
            )
            : [[]];
        if (!rows[0]) {
            return middleware.sendError(res, "rest_member_not_found");
        }
        // The Super Admin's own role (or another Super Admin's) can't be changed here
        if (rows[0].role === constant.ROLES.SUPER_ADMIN) {
            return middleware.sendError(res, "rest_role_change_not_allowed");
        }
        // A deactivated member can't be made an executive (taking the role away is still allowed)
        if (role === constant.ROLES.EXECUTIVE && rows[0].status !== constant.USER_STATUS.ACTIVE) {
            return middleware.sendError(res, "rest_member_inactive");
        }

        if (rows[0].role !== role) {
            const tellUser = await changeRole(id, role, request.loginUser.id);
            tellUser();
            common.logActivity(request, role === constant.ROLES.EXECUTIVE ? ACTIVITY.EXECUTIVE_ADDED : ACTIVITY.EXECUTIVE_REMOVED, "users", id);
        }
        return middleware.sendSuccess(res, "rest_role_updated", { user: common.sanitizeUser(await common.getUserDetails({ id })) });
    } catch (error) {
        return middleware.sendServerError(res, "setMemberRole", error);
    }
};

// Executive Requests with the member's name and contact, newest first. ?status=pending is the queue
executiveModule.getExecutiveRequests = async (request, res) => {
    try {
        const { page, limit, status, search } = request.body;
        const where = ["a.is_deleted = 0"];
        const params = [];
        if (search) {
            where.push("(u.full_name ILIKE ? OR u.mobile ILIKE ? OR u.email ILIKE ?)");
            const like = common.likeText(search);
            params.push(like, like, like);
        }
        // The tab counts use every filter except the status itself
        const countWhereSql = where.join(" AND ");
        const countParams = [...params];
        if (status) {
            where.push("a.status = ?");
            params.push(status);
        }
        const whereSql = where.join(" AND ");
        const [[rows], [[count]], [statusCounts]] = await Promise.all([
            db.query(
                `SELECT a.id, a.status, a.donation_amount, a.reference_no, a.reason, a.payment_proof_url, a.review_note,
                    a.donation_id, d.status AS donation_status, a.created_at, a.reviewed_at,
                    u.id AS user_id, u.full_name, u.email, u.country_code, u.mobile, r.code AS role
                 FROM executive_applications a
                 JOIN users u ON u.id = a.user_id
                 JOIN roles r ON r.id = u.role_id
                 LEFT JOIN donations d ON d.id = a.donation_id
                 WHERE ${whereSql}
                 ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
                [...params, limit, (page - 1) * limit],
            ),
            db.query(`SELECT COUNT(*) AS total FROM executive_applications a JOIN users u ON u.id = a.user_id WHERE ${whereSql}`, params),
            db.query(
                `SELECT a.status, COUNT(*) AS total FROM executive_applications a JOIN users u ON u.id = a.user_id
                 WHERE ${countWhereSql} GROUP BY a.status`,
                countParams,
            ),
        ]);
        const counts = Object.fromEntries(Object.values(constant.EXEC_APPLICATION_STATUS).map((s) => [s, 0]));
        for (const c of statusCounts) counts[c.status] = c.total;
        const requests = rows.map((a) => ({
            ...a,
            donation_amount: Number(a.donation_amount),
            payment_proof_url: common.mediaUrl(a.payment_proof_url),
            mobile: `${a.country_code} ${a.mobile}`,
            country_code: undefined,
        }));
        return middleware.sendSuccess(res, "rest_keywords_success", { requests, counts, pagination: pageInfo(page, limit, count.total) });
    } catch (error) {
        return middleware.sendServerError(res, "getExecutiveRequests", error);
    }
};

// Approve → the member becomes an executive (same login). Reject → the reason is shown to the member.
// Only pending requests; the status check is in the UPDATE so it can't be reviewed twice
executiveModule.reviewExecutiveRequest = async (request, res) => {
    try {
        const id = routeId(request);
        const { action, reason } = request.body;
        const approving = action === REVIEW_ACTIONS.APPROVE;
        const admin_id = request.loginUser.id;

        // A deactivated member's request can be rejected, but not approved
        if (approving && id) {
            const [[applicant]] = await db.query(
                `SELECT u.status FROM executive_applications a JOIN users u ON u.id = a.user_id
                 WHERE a.id = ? AND a.is_deleted = 0`,
                [id],
            );
            if (applicant && applicant.status !== constant.USER_STATUS.ACTIVE) {
                return middleware.sendError(res, "rest_member_inactive");
            }
        }

        const outcome = await db.transaction(async (tx) => {
            const [result] = await tx.query(
                `UPDATE executive_applications SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?
                 WHERE id = ? AND status = ? AND is_deleted = 0
                 RETURNING user_id`,
                [approving ? constant.EXEC_APPLICATION_STATUS.APPROVED : constant.EXEC_APPLICATION_STATUS.REJECTED,
                    admin_id, reason || null, id ?? 0, constant.EXEC_APPLICATION_STATUS.PENDING],
            );
            const user_id = result.rows[0]?.user_id;
            if (!user_id) return null;
            const tellUser = approving
                ? await changeRole(user_id, constant.ROLES.EXECUTIVE, admin_id, tx)
                : () => common.sendNotification({
                    sender_id: admin_id,
                    receiver_ids: [user_id],
                    type: constant.NOTIFICATION_TYPE.GENERAL,
                    title: "notify_executive_request_rejected",
                    message: reason,
                });
            return { tellUser };
        });

        if (!outcome) {
            const [exists] = id ? await db.query("SELECT 1 FROM executive_applications WHERE id = ? AND is_deleted = 0", [id]) : [[]];
            return middleware.sendError(res, exists.length ? "rest_executive_request_not_pending" : "rest_executive_request_not_found");
        }
        outcome.tellUser(); // after the commit, so a failed review never notifies
        common.logActivity(request, approving ? ACTIVITY.EXECUTIVE_REQUEST_APPROVED : ACTIVITY.EXECUTIVE_REQUEST_REJECTED, "executive_applications", id);
        return middleware.sendSuccess(res, approving ? "rest_executive_request_approved" : "rest_executive_request_rejected");
    } catch (error) {
        return middleware.sendServerError(res, "reviewExecutiveRequest", error);
    }
};

// ---------- Status changes from the admin panel ----------

// PUT /user/events/:id/status (Super Admin): posted / draft / cancelled. Posting announces it to members
executiveModule.setEventStatus = async (request, res) => {
    try {
        const id = routeId(request);
        const row = id ? await findRow("events", id) : null;
        if (!row) return middleware.sendError(res, "rest_event_not_found");

        await query.updateQuery("events", EVENT_STATUS_COLUMNS[request.body.status](request.loginUser.id), "id = ?", [id]);
        common.notifyNewContent();
        const statusActivity = { posted: ACTIVITY.EVENT_POSTED, draft: ACTIVITY.EVENT_DRAFT, cancelled: ACTIVITY.EVENT_CANCELLED };
        common.logActivity(request, statusActivity[request.body.status], "events", id);
        return middleware.sendSuccess(res, "rest_event_status_changed", { event: await userModule.fullEvent(id, request.lang) });
    } catch (error) {
        return middleware.sendServerError(res, "setEventStatus", error);
    }
};

// PUT /user/events/:id/featured (Super Admin): featured events come first in the app's home slider
executiveModule.setEventFeatured = async (request, res) => {
    try {
        const id = routeId(request);
        const row = id ? await findRow("events", id) : null;
        if (!row) return middleware.sendError(res, "rest_event_not_found");

        const { is_featured } = request.body;
        await query.updateQuery("events", { is_featured: is_featured ? 1 : 0 }, "id = ?", [id]);
        common.logActivity(request, is_featured ? ACTIVITY.EVENT_FEATURED : ACTIVITY.EVENT_UNFEATURED, "events", id);
        return middleware.sendSuccess(res, is_featured ? "rest_event_featured" : "rest_event_unfeatured", {
            event: await userModule.fullEvent(id, request.lang),
        });
    } catch (error) {
        return middleware.sendServerError(res, "setEventFeatured", error);
    }
};

// PUT /user/notices/:id/status (owner or Super Admin): published (live now) or draft (hidden)
executiveModule.setNoticeStatus = async (request, res) => {
    try {
        const notice = await findOwnRow(request, res, "notices", "rest_notice_not_found");
        if (!notice) return undefined;

        const publishing = request.body.status === NOTICE_STATUS.PUBLISHED;
        await query.updateQuery(
            "notices",
            { status: request.body.status, published_at: publishing ? new Date() : null },
            "id = ?",
            [notice.id],
        );
        common.notifyNewContent();
        common.logActivity(request, publishing ? ACTIVITY.NOTICE_PUBLISHED : ACTIVITY.NOTICE_DRAFT, "notices", notice.id);
        return middleware.sendSuccess(res, "rest_notice_status_changed", { notice: await userModule.fullNotice(notice.id) });
    } catch (error) {
        return middleware.sendServerError(res, "setNoticeStatus", error);
    }
};

// ---------- Event Planning (future_event_plans) ----------
// One board for the executives with the Events section: everyone sees every plan; an executive edits their own,
// the Super Admin any (common.canChange). Soonest tentative date first, undated plans last

// GET /user/event-plans?page=&limit=&status=&search=
executiveModule.getEventPlans = async (request, res) => {
    try {
        const { page, limit, status, search } = request.body;
        const where = ["p.is_deleted = 0"];
        const params = [];
        if (status) {
            where.push("p.status = ?");
            params.push(status);
        }
        if (search) {
            where.push("(p.title ILIKE ? OR p.notes ILIKE ?)");
            params.push(common.likeText(search), common.likeText(search));
        }
        const from = `FROM future_event_plans p LEFT JOIN users u ON u.id = p.created_by WHERE ${where.join(" AND ")}`;
        const { rows, pagination } = await query.fetchPage(
            `SELECT p.id, p.title, p.notes, TO_CHAR(p.tentative_date, 'YYYY-MM-DD') AS tentative_date, p.status,
                p.converted_event_id, p.created_by, COALESCE(u.full_name, u.email) AS created_by_name, p.created_at, p.updated_at
             ${from}
             ORDER BY p.tentative_date NULLS LAST, p.id DESC`,
            `SELECT COUNT(*) AS total ${from}`,
            params,
            { page, limit },
        );
        const plans = rows.map((p) => ({ ...p, can_edit: common.canChange(request.loginUser, p.created_by) ? 1 : 0 }));
        return middleware.sendSuccess(res, "rest_keywords_success", { plans, pagination });
    } catch (error) {
        return middleware.sendServerError(res, "getEventPlans", error);
    }
};

// POST /user/event-plans and PUT /user/event-plans/:id (own plan, or the Super Admin)
executiveModule.saveEventPlan = async (request, res) => {
    try {
        const editing = !!request.params.id;
        const plan = editing ? await findOwnRow(request, res, "future_event_plans", "rest_event_plan_not_found") : null;
        if (editing && !plan) return undefined;

        const { title, notes, tentative_date, status } = request.body;
        const data = { title, notes: notes || null, tentative_date: tentative_date || null, status };
        let planId = plan?.id;
        if (editing) {
            await query.updateQuery("future_event_plans", data, "id = ?", [planId]);
        } else {
            const [result] = await query.insertQuery("future_event_plans", { ...data, created_by: request.loginUser.id });
            planId = result.insertId;
        }
        common.logActivity(request, editing ? ACTIVITY.EVENT_PLAN_UPDATED : ACTIVITY.EVENT_PLAN_CREATED, "future_event_plans", planId);
        return middleware.sendSuccess(res, editing ? "rest_event_plan_updated" : "rest_event_plan_saved", { plan: { id: planId, ...data } });
    } catch (error) {
        return middleware.sendServerError(res, "saveEventPlan", error);
    }
};

// DELETE /user/event-plans/:id: soft delete (own plan, or the Super Admin)
executiveModule.deleteEventPlan = async (request, res) => {
    try {
        const plan = await findOwnRow(request, res, "future_event_plans", "rest_event_plan_not_found");
        if (!plan) return undefined;
        await query.updateQuery("future_event_plans", { is_deleted: 1 }, "id = ?", [plan.id]);
        common.logActivity(request, ACTIVITY.EVENT_PLAN_DELETED, "future_event_plans", plan.id);
        return middleware.sendSuccess(res, "rest_event_plan_deleted");
    } catch (error) {
        return middleware.sendServerError(res, "deleteEventPlan", error);
    }
};

export default executiveModule;
