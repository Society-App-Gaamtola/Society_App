import Joi from "joi";
import constant from "../../../config/constant.js";
import { pagination, mediaUrl } from "./userValidation.js";
import { deviceFields, mobileNumber, email, username, address, newPassword } from "./authValidation.js";

// yyyy-mm-dd, kept as text so no time zone shifts the day
const day = Joi.date().iso().raw();
// to_date must not be before from_date
const dateRange = {
  from_date: day,
  to_date: day.when("from_date", { is: Joi.exist(), then: Joi.date().iso().min(Joi.ref("from_date")).raw() }),
};

// Admin panel login: email + password (+ the optional device fields, e.g. device_type "web")
const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
  ...deviceFields,
});

// Dashboard: optional date range from the panel's date picker
const dashboardSchema = Joi.object({ ...dateRange });

// ---------- Members ----------
// Every admin list is paged (page, limit ≤ MAX_PAGE_SIZE): the panel never gets all rows at once
const memberListSchema = Joi.object({
  ...pagination,
  ...dateRange, // join date
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  role: Joi.string().valid(...constant.ASSIGNABLE_ROLES), // member | executive (the Super Admin isn't listed)
  status: Joi.string().valid(...Object.values(constant.USER_STATUS)),
  signup: Joi.string().valid(...Object.values(constant.MEMBER_SIGNUP_FILTER)),
  sort: Joi.string().valid(...constant.MEMBER_SORT_FIELDS).default("joined"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});

// Edit: send only what changes (at least one field). The mobile number goes with its country code
const memberEditSchema = Joi.object({
  username,
  email,
  country_code: Joi.string().trim().pattern(/^\+\d{1,4}$/), // no "+91" default here: it only comes with mobile_number
  mobile_number: mobileNumber,
  address: address.allow(""),
  member_code: Joi.string().trim().max(constant.MEMBER_CODE_MAX_LENGTH).allow("", null),
})
  .min(1)
  .and("country_code", "mobile_number");

// Add a member by hand (people who don't sign up in the app). They log in with this email / mobile and password
const memberCreateSchema = Joi.object({
  username: username.required(),
  email: email.required(),
  country_code: Joi.string().trim().pattern(/^\+\d{1,4}$/).default(constant.DEFAULT_COUNTRY_CODE),
  mobile_number: mobileNumber.required(),
  password: newPassword.required(),
  address: address.allow("", null),
  member_code: Joi.string().trim().max(constant.MEMBER_CODE_MAX_LENGTH).allow("", null), // empty = the next GM code
  role: Joi.string().valid(...constant.ASSIGNABLE_ROLES).default(constant.ROLES.MEMBER),
});

// ---------- Executives ----------
const executiveListSchema = Joi.object({
  ...pagination,
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  sort: Joi.string().valid(...constant.MEMBER_SORT_FIELDS).default("name"),
  order: Joi.string().valid("asc", "desc").default("asc"),
});

// The whole set of sections (replaces the old one)
const executivePermissionsSchema = Joi.object({
  sections: Joi.array().items(Joi.string().valid(...constant.PERMISSION_SECTIONS)).unique().required(),
});

// ---------- Donations / expenses ----------
const id = Joi.number().integer().min(1);
const amount = Joi.number().precision(2).min(constant.DONATION_MIN_AMOUNT).max(constant.AMOUNT_MAX);
const pastDay = Joi.date().iso().max("now").raw().messages({ "date.max": "{#label} can't be in the future" });
const optional = (max) => Joi.string().trim().max(max).allow("", null);
const listOrder = { order: Joi.string().valid("asc", "desc").default("desc") };

const donationListSchema = Joi.object({
  ...pagination,
  ...dateRange, // donation date
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  status: Joi.string().valid(...constant.DONATION_REVIEW_STATUSES),
  mode: Joi.string().valid(...constant.PAYMENT_MODES),
  purpose: Joi.string().trim().max(128),
  donor_user_id: id, // one member's donations (Member detail → Payment History export)
  sort: Joi.string().valid(...constant.DONATION_SORT_FIELDS).default("date"),
  ...listOrder,
});

// Create / edit (an edit replaces the fields): a member (donor_user_id, or member_code as typed in the app) or a
// donor name
const donationSchema = Joi.object({
  donor_user_id: id.allow(null),
  member_code: Joi.string().trim().uppercase().max(16).allow("", null),
  donor_name: Joi.string().trim().max(128).when("donor_user_id", {
    is: Joi.number().required(),
    then: Joi.strip(),
    otherwise: Joi.when("member_code", { is: Joi.string().min(1).required(), then: Joi.allow("", null), otherwise: Joi.required() }),
  }),
  amount: amount.required(),
  purpose: Joi.string().trim().max(128).required(),
  method: Joi.string().valid(...constant.ADMIN_DONATION_METHODS).required(),
  reference_no: optional(64),
  donated_on: pastDay.required(),
  status: Joi.string().valid(...constant.DONATION_REVIEW_STATUSES).default(constant.DONATION_STATUS.SUCCESS),
  proof_url: mediaUrl.allow("", null),
  note: optional(256),
});
const donationStatusSchema = Joi.object({ status: Joi.string().valid(...constant.DONATION_REVIEW_STATUSES).required() });

const expenseListSchema = Joi.object({
  ...pagination,
  ...dateRange, // expense date
  search: Joi.string().trim().max(constant.SEARCH_MAX_LENGTH).allow(""),
  status: Joi.string().valid(...Object.values(constant.EXPENSE_STATUS)),
  mode: Joi.string().valid(...constant.EXPENSE_MODES),
  category: Joi.string().trim().max(64),
  sort: Joi.string().valid(...constant.EXPENSE_SORT_FIELDS).default("date"),
  ...listOrder,
});
const expenseSchema = Joi.object({
  description: Joi.string().trim().max(256).required(),
  paid_to: Joi.string().trim().max(128).required(),
  category: Joi.string().trim().max(64).required(),
  amount: amount.required(),
  mode: Joi.string().valid(...constant.EXPENSE_MODES).required(),
  reference_no: optional(64),
  txn_date: pastDay.required(),
  status: Joi.string().valid(...Object.values(constant.EXPENSE_STATUS)).default(constant.EXPENSE_STATUS.PENDING),
  bill_url: mediaUrl.allow("", null),
});
const expenseStatusSchema = Joi.object({ status: Joi.string().valid(...Object.values(constant.EXPENSE_STATUS)).required() });

// ---------- Financial reports ----------
const financeSchema = Joi.object({ ...dateRange });
const reportDataSchema = Joi.object({
  ...pagination,
  ...dateRange,
  category: Joi.string().trim().max(128),
  mode: Joi.string().valid(...constant.PAYMENT_MODES),
});
const reportListSchema = Joi.object({ ...pagination });
const reportSaveSchema = Joi.object({
  report_type: Joi.string().valid(...constant.REPORT_TYPES).required(),
  ...dateRange,
  category: Joi.string().trim().max(128).allow("", null),
  mode: Joi.string().valid(...constant.PAYMENT_MODES).allow("", null),
});

// ---------- App settings (only what is sent) ----------
const text = Joi.string().trim().max(constant.SETTING_TEXT_MAX_LENGTH);
const nameList = Joi.array()
  .items(Joi.string().trim().min(1).max(64))
  .unique((a, b) => a.toLowerCase() === b.toLowerCase())
  .min(1)
  .max(constant.SETTING_LIST_MAX_ITEMS);
const settingsSchema = Joi.object({
  society_name: text.min(2),
  society_name_gu: text.allow(""),
  contact_email: Joi.string().trim().lowercase().email().allow(""),
  phone: Joi.string().trim().pattern(/^\+?[\d\s-]{7,20}$/).allow("").messages({ "string.pattern.base": "phone must be a phone number" }),
  address: Joi.string().trim().max(512).allow(""),
  logo_url: mediaUrl.allow(null),
  show_gujarati_name: Joi.boolean(),
  executive_min_donation: Joi.number().integer().min(0).max(constant.AMOUNT_MAX),
  allow_registration: Joi.boolean(),
  allow_uploads: Joi.boolean(),
  require_media_approval: Joi.boolean(),
  event_notifications: Joi.boolean(),
  notify_new_member: Joi.boolean(),
  notify_donation: Joi.boolean(),
  notify_executive_request: Joi.boolean(),
  notify_media_upload: Joi.boolean(),
  notify_expense: Joi.boolean(),
  donation_purposes: nameList,
  expense_categories: nameList,
  // Notice categories, stored lowercase (notices.tag)
  notice_tags: Joi.array()
    .items(Joi.string().trim().lowercase().min(1).max(constant.NOTICE_TAG_MAX_LENGTH))
    .unique()
    .min(1)
    .max(constant.SETTING_LIST_MAX_ITEMS),
  // Page links (https://…); "" hides that network in the app
  social_links: Joi.object(Object.fromEntries(constant.SOCIAL_NETWORKS.map((network) => [
    network,
    Joi.string().trim().max(constant.SOCIAL_LINK_MAX_LENGTH).uri({ scheme: ["https", "http"] }).allow(""),
  ]))),
  // The full list: keep { id, name }, add { name }
  event_categories: Joi.array()
    .items(Joi.object({ id, name: Joi.string().trim().min(1).max(64).required() }))
    .min(1)
    .max(constant.SETTING_LIST_MAX_ITEMS),
  upi: Joi.object({
    payee_name: Joi.string().trim().max(128).required(),
    upi_id: Joi.string().trim().pattern(/^[\w.-]{2,}@[a-zA-Z]{2,}$/).required().messages({ "string.pattern.base": "upi_id must look like name@bank" }),
    qr_image_url: mediaUrl.allow("", null),
    display_note: Joi.string().trim().max(256).allow("", null),
  }).allow(null),
}).min(1);

const memberStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(constant.USER_STATUS)).required(),
});

export default {
  loginSchema,
  dashboardSchema,
  memberListSchema,
  memberEditSchema,
  memberCreateSchema,
  memberStatusSchema,
  executiveListSchema,
  executivePermissionsSchema,
  donationListSchema,
  donationSchema,
  donationStatusSchema,
  expenseListSchema,
  expenseSchema,
  expenseStatusSchema,
  financeSchema,
  reportDataSchema,
  reportListSchema,
  reportSaveSchema,
  settingsSchema,
};
