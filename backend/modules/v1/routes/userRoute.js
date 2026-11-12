import express from "express";
import userController from "../controllers/userController.js";
import middleware from "../../../middleware/middleware.js";
import schemas from "../validation_rules/userValidation.js";

const { eventListSchema, noticeListSchema } = schemas;

const userRoutes = express.Router();

// Any logged-in user (Member, Executive, Super Admin). Filters are optional query parameters

// Hero slider, 5 upcoming events and 5 latest notices
userRoutes.get("/home", userController.getHome);

// ?page=&limit=&search=&category_id=&from_date=&to_date=&upcoming=
userRoutes.get("/events", middleware.validateJoi(eventListSchema, true), userController.getEvents);

userRoutes.get("/events/:id", userController.getEventDetails);

userRoutes.get("/event-categories", userController.getEventCategories);

// ?page=&limit=&search=&tag=&from_date=&to_date=
userRoutes.get("/notices", middleware.validateJoi(noticeListSchema, true), userController.getNotices);

userRoutes.get("/notices/:id", userController.getNoticeDetails);

export default userRoutes;
