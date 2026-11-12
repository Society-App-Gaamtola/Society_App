import Joi from "joi";
import constant from "../../../config/constant.js";

// All filters are optional and come in the query string
const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(constant.MAX_PAGE_SIZE).default(constant.DEFAULT_PAGE_SIZE),
};

// yyyy-mm-dd. raw() keeps the text, so the date isn't shifted by the server's time zone
const dateRange = {
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  from_date: Joi.date().iso().raw(),
  to_date: Joi.date().iso().raw().when("from_date", {
    is: Joi.exist(),
    then: Joi.date().iso().min(Joi.ref("from_date")).raw(),
  }),
};

// Events: name search, category, date range. upcoming=true leaves out finished events
const eventListSchema = Joi.object({
  ...pagination,
  ...dateRange,
  category_id: Joi.number().integer().min(1),
  upcoming: Joi.boolean(),
});

// Notices: title / text search, tag (the notice "category"), date range
const noticeListSchema = Joi.object({
  ...pagination,
  ...dateRange,
  tag: Joi.string().trim().lowercase().valid(...constant.NOTICE_TAGS),
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

const mediaListSchema = Joi.object({
  ...pagination,
  category_id: Joi.number().integer().min(1),
});

export default {
  eventListSchema,
  noticeListSchema,
  saveMediaSchema,
  mediaListSchema,
};
