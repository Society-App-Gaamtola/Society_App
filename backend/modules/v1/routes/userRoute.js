import express from "express";
import userController from "../controllers/userController.js";
import executiveController from "../controllers/executiveController.js";
import middleware from "../../../middleware/middleware.js";
import schemas from "../validation_rules/userValidation.js";
import executiveSchemas from "../validation_rules/executiveValidation.js";
import constant from "../../../config/constant.js";

const {
  eventListSchema, noticeListSchema, saveMediaSchema, mediaListSchema, editMediaSchema,
  notificationListSchema, notificationSettingsSchema, memberListSchema, donationListSchema, donationSchema, donationPaymentSchema,
  executiveRequestSchema,
} = schemas;
const {
  eventSchema, noticeSchema, reviewSchema, eventStatusSchema, eventFeaturedSchema, noticeStatusSchema, eventPlanSchema, eventPlanListSchema,
} = executiveSchemas;
const { MEMBER, EXECUTIVE, SUPER_ADMIN } = constant.ROLES;

// One URL per item for every role: listing / details for everyone, writes only for the roles below.
// The role is checked first on each route (no database query: it is on req.loginUser); a wrong role gets 403
const allUsers = middleware.allowedRoles(MEMBER, EXECUTIVE, SUPER_ADMIN);
// Add / edit / delete events and notices (an executive only their own: checked in the module)
const executives = middleware.allowedRoles(SUPER_ADMIN, EXECUTIVE);
// After the role: an executive also needs that panel section (executive permissions). The Super Admin always passes
const eventsSection = middleware.requirePermission("events");
const noticesSection = middleware.requirePermission("notices");
const mediaSection = middleware.requirePermission("media");
// Approve / reject events and gallery items
const superAdmin = middleware.allowedRoles(SUPER_ADMIN);
// Only members can ask to become an executive
const members = middleware.allowedRoles(MEMBER);

const userRoutes = express.Router();

// Hero slider, 5 upcoming events and 5 latest notices
userRoutes.get("/home", allUsers, userController.getHome);

// One events API for everyone: ?page=&limit=&search=&category_id=&from_date=&to_date=&upcoming=
// Executive / Super Admin also: &mine=true (own events, any status) and &status= (draft, scheduled, posted, cancelled)
userRoutes.get("/events", allUsers, middleware.validateJoi(eventListSchema, true), userController.getEvents);
userRoutes.get("/events/:id", allUsers, userController.getEventDetails);
// Body: the event + action (draft | post | schedule, with publish_at). No approval: post / schedule go live
userRoutes.post("/events", executives, eventsSection, middleware.validateJoi(eventSchema), executiveController.createEvent);
userRoutes.put("/events/:id", executives, eventsSection, middleware.validateJoi(eventSchema), executiveController.updateEvent);
userRoutes.delete("/events/:id", executives, eventsSection, executiveController.deleteEvent);
// Body: status (posted | draft | cancelled). Posting announces it
userRoutes.put("/events/:id/status", superAdmin, middleware.validateJoi(eventStatusSchema), executiveController.setEventStatus);
// Body: is_featured (true | false). Featured events come first in the app's home slider
userRoutes.put("/events/:id/featured", superAdmin, middleware.validateJoi(eventFeaturedSchema), executiveController.setEventFeatured);

userRoutes.get("/event-categories", allUsers, userController.getEventCategories);

// One notices API for everyone: ?page=&limit=&search=&tag=&from_date=&to_date=
// Executive / Super Admin also: &mine=true and &status= (draft, published)
// Event Planning board: executives with the Events section (an executive edits their own plans; checked in the module)
userRoutes.get("/event-plans", executives, eventsSection, middleware.validateJoi(eventPlanListSchema, true), executiveController.getEventPlans);
userRoutes.post("/event-plans", executives, eventsSection, middleware.validateJoi(eventPlanSchema), executiveController.saveEventPlan);
userRoutes.put("/event-plans/:id", executives, eventsSection, middleware.validateJoi(eventPlanSchema), executiveController.saveEventPlan);
userRoutes.delete("/event-plans/:id", executives, eventsSection, executiveController.deleteEventPlan);

userRoutes.get("/notices", allUsers, middleware.validateJoi(noticeListSchema, true), userController.getNotices);
userRoutes.get("/notices/:id", allUsers, userController.getNoticeDetails);
// Body: the notice + action (draft | publish, optional future publish_at), audience + recipient_ids
userRoutes.post("/notices", executives, noticesSection, middleware.validateJoi(noticeSchema), executiveController.createNotice);
userRoutes.put("/notices/:id", executives, noticesSection, middleware.validateJoi(noticeSchema), executiveController.updateNotice);
userRoutes.delete("/notices/:id", executives, noticesSection, executiveController.deleteNotice);
// Body: status (published | draft). Owner or Super Admin
userRoutes.put("/notices/:id/status", executives, noticesSection, middleware.validateJoi(noticeStatusSchema), executiveController.setNoticeStatus);

// Gallery. The app uploads files to Cloudinary itself and sends their links: ?page=&limit=&category_id=&event_id=
// &status= (Super Admin: every item in that status, pending = the approval queue; others: their own items)
userRoutes.get("/media", allUsers, middleware.validateJoi(mediaListSchema, true), userController.getMedia);
userRoutes.post("/media", allUsers, middleware.validateJoi(saveMediaSchema), userController.saveMedia);
userRoutes.get("/media/:id", allUsers, userController.getMediaDetails);
// Own items only: caption, category_id, event_id
userRoutes.put("/media/:id", allUsers, middleware.validateJoi(editMediaSchema), userController.editMedia);
// Own items, or the Super Admin
userRoutes.delete("/media/:id", allUsers, userController.deleteMedia);
// Body: action (approve | reject), reason (required to reject). Works on any status
// The Super Admin, or an executive given the Media section
userRoutes.put("/media/:id/review", executives, mediaSection, middleware.validateJoi(reviewSchema), executiveController.reviewMedia);

// Notifications: ?page=&limit=&type= (event | notice | donation | general). Includes unread_count for the bell
userRoutes.get("/notifications", allUsers, middleware.validateJoi(notificationListSchema, true), userController.getNotifications);
userRoutes.put("/notifications/read-all", allUsers, userController.readAllNotifications);
userRoutes.put("/notifications/:id/read", allUsers, userController.readNotification);
// The app's Settings → Notifications switches (events / notices / payments), saved per user
userRoutes.get("/notification-settings", allUsers, userController.getNotificationSettings);
userRoutes.put("/notification-settings", allUsers, middleware.validateJoi(notificationSettingsSchema), userController.saveNotificationSettings);

// Member directory: ?page=&limit=&search=&role=
userRoutes.get("/members", allUsers, middleware.validateJoi(memberListSchema, true), userController.getMembers);

// Donations: the society's UPI details, the member's own donations, a new UPI / cash donation, and the UTR (+ screenshot)
// of a UPI donation after paying
userRoutes.get("/app-info", allUsers, userController.getAppInfo);
userRoutes.get("/donation-settings", allUsers, userController.getDonationSettings);
userRoutes.get("/donations", allUsers, middleware.validateJoi(donationListSchema, true), userController.getMyDonations);
userRoutes.post("/donations", allUsers, middleware.validateJoi(donationSchema), userController.createDonation);
userRoutes.put("/donations/:id/payment", allUsers, middleware.validateJoi(donationPaymentSchema), userController.submitDonationPayment);

// Executive Request: the latest request's status, and a new request (members only)
userRoutes.get("/executive-request", allUsers, userController.getExecutiveRequest);
userRoutes.post("/executive-request", members, middleware.validateJoi(executiveRequestSchema), userController.createExecutiveRequest);

export default userRoutes;
