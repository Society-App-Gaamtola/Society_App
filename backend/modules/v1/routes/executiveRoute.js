import express from "express";
import executiveController from "../controllers/executiveController.js";
import middleware from "../../../middleware/middleware.js";
import schemas from "../validation_rules/executiveValidation.js";
import constant from "../../../config/constant.js";

const { reviewSchema, roleSchema, executiveRequestListSchema } = schemas;
const { SUPER_ADMIN } = constant.ROLES;

// Who may call each API is decided here, first in every route: a wrong role gets 403 before validation,
// the controller or any database query (the role is already on req.loginUser from tokenMiddleware)
const superAdmin = middleware.allowedRoles(SUPER_ADMIN);

// Events, notices and gallery (list, details, add / edit / delete, review) are all under /user (userRoute.js),
// one URL per item for every role. This file keeps the Super Admin's member management
const executiveRoutes = express.Router();

// ---------- Roles ----------
// The Super Admin makes a member an executive (or back). The user keeps their email and password; the app shows
// the executive screens after its next profile reload. Body: role (member | executive)
executiveRoutes.put("/members/:id/role", superAdmin, middleware.validateJoi(roleSchema), executiveController.setMemberRole);

// ---------- Executive Requests ----------
// ?page=&limit=&status= (pending = the queue). Approving makes the member an executive
executiveRoutes.get("/executive-requests", superAdmin, middleware.validateJoi(executiveRequestListSchema, true), executiveController.getExecutiveRequests);
executiveRoutes.put("/executive-requests/:id/review", superAdmin, middleware.validateJoi(reviewSchema), executiveController.reviewExecutiveRequest);

export default executiveRoutes;
