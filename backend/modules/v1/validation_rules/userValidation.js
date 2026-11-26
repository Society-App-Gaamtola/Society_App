import Joi from "joi";
import constant from "../../../config/constant.js";

// All filters are optional and come in the query string
export const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(constant.MAX_PAGE_SIZE).default(constant.DEFAULT_PAGE_SIZE),
};

// yyyy-mm-dd. raw() keeps the text, so the date isn't shifted by the server's time zone
export const dateRange = {
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  from_date: Joi.date().iso().raw(),
  to_date: Joi.date().iso().raw().when("from_date", {
    is: Joi.exist(),
    then: Joi.date().iso().min(Joi.ref("from_date")).raw(),
  }),
};

// Events: name search, category, date range. upcoming=true leaves out finished events.
// Executive / Super Admin only (ignored for members): mine=true → own events in any status, status → that status
const eventListSchema = Joi.object({
  ...pagination,
  ...dateRange,
  category_id: Joi.number().integer().min(1),
  upcoming: Joi.boolean(),
  mine: Joi.boolean(),
  manage: Joi.boolean(), // every status (the admin panel's Events tab)
  status: Joi.string().valid(...Object.values(constant.EVENT_STATUS)),
});

// Notices: title / text search, tag (the notice "category"), date range
// Executive / Super Admin only (ignored for members): mine=true → own notices in any status, status → that status
const noticeListSchema = Joi.object({
  ...pagination,
  ...dateRange,
  tag: Joi.string().trim().lowercase().max(constant.NOTICE_TAG_MAX_LENGTH), // one of App Settings' notice_tags
  mine: Joi.boolean(),
  manage: Joi.boolean(), // every status (the admin panel's Notices tab)
  status: Joi.string().valid(...Object.values(constant.NOTICE_STATUS)),
});

// A link to a file the app uploaded to the society's Cloudinary account
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const mediaUrl = Joi.string()
  .trim()
  .max(constant.MEDIA_URL_MAX_LENGTH)
  .pattern(new RegExp(`^${escapeRegex(constant.MEDIA_URL_PREFIX)}`))
  .messages({ "string.pattern.base": "{#label} must be a link to an uploaded file" });

// Gallery: a photo or video already uploaded to Cloudinary by the app
const saveMediaSchema = Joi.object({
  media_url: mediaUrl.required(),
  media_type: Joi.string().valid("photo", "video").required(),
  thumbnail_url: mediaUrl,
  public_id: Joi.string().trim().max(256).required(),
  file_size_bytes: Joi.number().integer().min(0),
  category_id: Joi.number().integer().min(1).required(),
  event_id: Joi.number().integer().min(1),
  caption: Joi.string().trim().max(constant.CAPTION_MAX_LENGTH).allow(""),
});

// Gallery. status: the Super Admin gets every item in that status (pending = the approval queue);
// others get only their own items in that status
const mediaListSchema = Joi.object({
  ...pagination,
  ...dateRange, // search (caption / uploader / category) + upload dates
  category_id: Joi.number().integer().min(1),
  event_id: Joi.number().integer().min(1),
  media_type: Joi.string().valid("photo", "video"),
  status: Joi.string().valid(...Object.values(constant.MEDIA_STATUS)),
  manage: Joi.boolean(), // every status (the admin panel's Media Approval "All" tab); counts come back too
});

// The uploader edits their own gallery item: at least one field. event_id null unlinks the event
const editMediaSchema = Joi.object({
  caption: Joi.string().trim().max(constant.CAPTION_MAX_LENGTH).allow(""),
  category_id: Joi.number().integer().min(1),
  event_id: Joi.number().integer().min(1).allow(null),
}).min(1);

// ---------- Member features ----------

const notificationListSchema = Joi.object({
  ...pagination,
  type: Joi.string().valid(...Object.values(constant.NOTIFICATION_TYPE)),
});

// The app's Settings → Notifications switches: send only what changes
const notificationSettingsSchema = Joi.object({
  events: Joi.boolean(),
  notices: Joi.boolean(),
  payments: Joi.boolean(),
}).min(1);

const memberListSchema = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  role: Joi.string().valid(...constant.DIRECTORY_ROLES),
});

const donationListSchema = Joi.object({ ...pagination });

// A UPI transaction ID (UTR / RRN) is 12 digits
const utr = Joi.string().trim().pattern(/^\d{12}$/).messages({ "string.pattern.base": "reference_no must be the 12-digit UPI transaction ID (UTR)" });

// UPI app / QR: saved first without a UTR (its receipt number goes in the UPI note), then the UTR is sent with
// PUT /donations/:id/payment. Older app builds still send the UTR here. Cash: paid at the office, no reference
const donationSchema = Joi.object({
  amount: Joi.number().precision(2).min(constant.DONATION_MIN_AMOUNT).max(constant.DONATION_MAX_AMOUNT).required(),
  purpose: Joi.string().trim().max(128).required(), // must be one of the settings' donation purposes (module)
  method: Joi.string().valid(...constant.MEMBER_DONATION_METHODS).required(),
  // Checked only for UPI; for cash anything sent is dropped
  reference_no: Joi.when("method", { is: Joi.valid(...constant.UPI_METHODS), then: utr.optional(), otherwise: Joi.any().strip() }),
});

// After paying by UPI: the UTR, which UPI way was used, and an optional screenshot (Cloudinary proofs/user_<id>/)
const donationPaymentSchema = Joi.object({
  reference_no: utr.required(),
  method: Joi.string().valid(...constant.UPI_METHODS),
  proof_url: mediaUrl.allow("", null),
});

const executiveRequestSchema = Joi.object({
  // At least the executive minimum from the settings (checked in the module)
  donation_amount: Joi.number().precision(2).min(constant.DONATION_MIN_AMOUNT).max(constant.DONATION_MAX_AMOUNT).required(),
  reference_no: Joi.string().trim().max(64).required(),
  reason: Joi.string().trim().max(constant.EXEC_REASON_MAX_LENGTH).required(),
  payment_proof_url: mediaUrl.allow("", null),
});

export default {
  eventListSchema,
  noticeListSchema,
  saveMediaSchema,
  mediaListSchema,
  editMediaSchema,
  notificationListSchema,
  notificationSettingsSchema,
  memberListSchema,
  donationListSchema,
  donationSchema,
  donationPaymentSchema,
  executiveRequestSchema,
};
