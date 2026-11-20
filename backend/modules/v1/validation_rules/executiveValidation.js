import Joi from "joi";
import constant from "../../../config/constant.js";
import { pagination, mediaUrl } from "./userValidation.js";

const { EVENT_ACTIONS, NOTICE_ACTIONS, REVIEW_ACTIONS, NOTICE_AUDIENCE } = constant;

const id = Joi.number().integer().min(1);
// "18:30" or "18:30:00"
const time = Joi.string().trim().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).messages({ "string.pattern.base": "{#label} must be a time like 18:30" });
const day = Joi.date().iso().raw(); // yyyy-mm-dd, kept as text so no time zone shifts the day
const optionalText = (max) => Joi.string().trim().max(max).allow("", null);
// A publish time must still be ahead when the request arrives
const futureTime = Joi.date().iso().greater("now").messages({ "date.greater": "{#label} must be in the future" });

// ---------- Events ----------
// Create and edit send the whole event (edit replaces every field), plus what to do with it:
//   draft → saved for later; post → live now; schedule → live at publish_at.
// There is no approval step: post / schedule go live for every creator
const eventSchema = Joi.object({
  category_id: id.required(),
  title: Joi.string().trim().max(constant.TITLE_MAX_LENGTH).required(),
  description: optionalText(constant.DESCRIPTION_MAX_LENGTH),
  event_date: day.required(),
  end_date: Joi.date().iso().min(Joi.ref("event_date")).raw().allow(null)
    .messages({ "date.min": "end_date must be on or after event_date" }),
  start_time: time.required(),
  end_time: time.allow("", null),
  venue_name: Joi.string().trim().max(constant.VENUE_MAX_LENGTH).required(),
  venue_address: optionalText(constant.ADDRESS_LINE_MAX_LENGTH),
  map_link: Joi.string().trim().uri({ scheme: ["http", "https"] }).max(constant.MEDIA_URL_MAX_LENGTH).allow("", null),
  poster_url: mediaUrl.allow("", null),
  // Every image of the event, in display order (replaces the old list on edit). Uploaded by the app to Cloudinary
  images: Joi.array().items(mediaUrl).unique().max(constant.EVENT_MAX_IMAGES).default([]),
  // The venue pin on the map: both or neither
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  organizer_name: optionalText(constant.ORGANIZER_MAX_LENGTH),
  contact_number: Joi.string().trim().pattern(/^\+?[\d\s-]{7,20}$/).allow("", null)
    .messages({ "string.pattern.base": "contact_number must be a phone number" }),
  action: Joi.string().valid(...Object.values(EVENT_ACTIONS)).required(),
  publish_at: futureTime.when("action", { is: EVENT_ACTIONS.SCHEDULE, then: Joi.required(), otherwise: Joi.strip() }),
  // Create only: the Event Planning plan this event is made from (it becomes "converted" and links to the event)
  plan_id: id.allow(null),
}).and("latitude", "longitude").messages({ "object.and": "latitude and longitude must be sent together" });

// ---------- Notices ----------
// action publish: live now, or at publish_at when it is given. audience "selected" needs recipient_ids (user ids)
const noticeSchema = Joi.object({
  title: Joi.string().trim().max(constant.TITLE_MAX_LENGTH).required(),
  body: Joi.string().trim().max(constant.DESCRIPTION_MAX_LENGTH).required(),
  tag: Joi.string().trim().lowercase().valid(...constant.NOTICE_TAGS).default("general"),
  event_id: id.allow(null),
  audience: Joi.string().valid(...Object.values(NOTICE_AUDIENCE)).default(NOTICE_AUDIENCE.ALL),
  recipient_ids: Joi.array().items(id).unique().min(1).max(constant.MAX_NOTICE_RECIPIENTS)
    .when("audience", { is: NOTICE_AUDIENCE.SELECTED, then: Joi.required(), otherwise: Joi.strip() }),
  action: Joi.string().valid(...Object.values(NOTICE_ACTIONS)).required(),
  publish_at: futureTime,
});

// ---------- Media (gallery moderation) ----------
// ---------- Approve / reject (events and media) ----------
const reviewSchema = Joi.object({
  action: Joi.string().valid(...Object.values(REVIEW_ACTIONS)).required(),
  reason: Joi.string().trim().max(constant.REASON_MAX_LENGTH)
    .when("action", { is: REVIEW_ACTIONS.REJECT, then: Joi.required(), otherwise: Joi.allow("", null) }),
});

// ---------- Roles and Executive Requests (Super Admin) ----------
const roleSchema = Joi.object({
  role: Joi.string().valid(...constant.ASSIGNABLE_ROLES).required(),
});

const executiveRequestListSchema = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  status: Joi.string().valid(...Object.values(constant.EXEC_APPLICATION_STATUS)),
});

// ---------- Status changes from the admin panel ----------
const eventStatusSchema = Joi.object({
  status: Joi.string().valid(constant.EVENT_STATUS.POSTED, constant.EVENT_STATUS.DRAFT, constant.EVENT_STATUS.CANCELLED).required(),
});
const eventFeaturedSchema = Joi.object({ is_featured: Joi.boolean().required() });
const noticeStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(constant.NOTICE_STATUS)).required(),
});

// ---------- Event Planning ----------
const eventPlanSchema = Joi.object({
  title: Joi.string().trim().max(constant.TITLE_MAX_LENGTH).required(),
  notes: optionalText(constant.DESCRIPTION_MAX_LENGTH),
  tentative_date: day.allow(null, ""),
  status: Joi.string().valid(...Object.values(constant.EVENT_PLAN_STATUS)).default(constant.EVENT_PLAN_STATUS.IDEA),
});
const eventPlanListSchema = Joi.object({
  ...pagination,
  status: Joi.string().valid(...Object.values(constant.EVENT_PLAN_STATUS)),
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
});

export default {
  eventSchema,
  eventPlanSchema,
  eventPlanListSchema,
  eventStatusSchema,
  eventFeaturedSchema,
  noticeStatusSchema,
  roleSchema,
  executiveRequestListSchema,
  noticeSchema,
  reviewSchema,
};
