import express from "express";
import adminController from "../controllers/adminController.js";
import middleware from "../../../middleware/middleware.js";
import schemas from "../validation_rules/adminValidation.js";
import constant from "../../../config/constant.js";

const {
  loginSchema, dashboardSchema, memberListSchema, memberEditSchema, memberStatusSchema, executiveListSchema, executivePermissionsSchema,
  activityListSchema, donationListSchema, donationSchema, donationStatusSchema, expenseListSchema, expenseSchema, expenseStatusSchema,
  financeSchema, reportDataSchema, reportListSchema, reportSaveSchema, settingsSchema,
} = schemas;

// Admin panel APIs. Every route except login is for the Super Admin only (checked first, no database query).
// The panel also uses the shared APIs with the same token: /user/events, /user/notices, /user/media, /executive/…
const superAdmin = middleware.allowedRoles(constant.ROLES.SUPER_ADMIN);
// Money and settings: the Super Admin, or an executive given that section (executive permissions)
const executives = middleware.allowedRoles(constant.ROLES.SUPER_ADMIN, constant.ROLES.EXECUTIVE);
const donationsSection = [executives, middleware.requirePermission("donations")];
const expensesSection = [executives, middleware.requirePermission("expenses")];
const reportsSection = [executives, middleware.requirePermission("reports")];
const settingsSection = [executives, middleware.requirePermission("settings")];

const adminRoutes = express.Router();

// Public (listed in constant.BYPASS_ROUTES). Body: email, password. Logout is the shared DELETE /auth/logout
// Rate limited first, together with the app's /auth/login (constant.RATE_LIMITS, no database query)
adminRoutes.post("/login", middleware.authLimits.ip, middleware.authLimits.login, middleware.validateJoi(loginSchema), adminController.login);

// Cards, pending counts and the monthly chart. ?from_date=&to_date= (optional)
adminRoutes.get("/dashboard", superAdmin, middleware.validateJoi(dashboardSchema, true), adminController.getDashboard);
// The activity log (audit_logs), newest first: ?page=&limit= (the dashboard shows the latest ACTIVITY_DASHBOARD_LIMIT)
adminRoutes.get("/activities", superAdmin, middleware.validateJoi(activityListSchema, true), adminController.getActivities);

// ---------- Members ----------
// Always paged (default 10 a page). ?page=&limit=&search=&role=&status=&signup=&from_date=&to_date=&sort=&order=
adminRoutes.get("/members", superAdmin, middleware.validateJoi(memberListSchema, true), adminController.getMembers);
// The member + donation summary and latest donations
adminRoutes.get("/members/:id", superAdmin, adminController.getMemberDetails);
// Only the fields sent: username, email, country_code + mobile_number, address, member_code
adminRoutes.put("/members/:id", superAdmin, middleware.validateJoi(memberEditSchema), adminController.editMember);
// Body: status (active | suspended). Deactivate / activate
adminRoutes.put("/members/:id/status", superAdmin, middleware.validateJoi(memberStatusSchema), adminController.setMemberStatus);
// Soft delete; logs the member out everywhere. A Super Admin can't be edited, deactivated or deleted here
adminRoutes.delete("/members/:id", superAdmin, adminController.deleteMember);

// ---------- Executives ----------
// Executives with their permissions (paged). Making / removing an executive is the role API (PUT /executive/members/:id/role)
adminRoutes.get("/executives", superAdmin, middleware.validateJoi(executiveListSchema, true), adminController.getExecutives);
// Body: sections ([events, notices, …]). Replaces the executive's permissions
adminRoutes.put("/executives/:id/permissions", superAdmin, middleware.validateJoi(executivePermissionsSchema), adminController.setExecutivePermissions);

// ---------- Donations (also the members' own, from the app) ----------
// ?page=&limit=&search=&status=&mode=&purpose=&from_date=&to_date=&sort=&order= → donations + summary (cards)
adminRoutes.get("/donations", ...donationsSection, middleware.validateJoi(donationListSchema, true), adminController.getDonations);
adminRoutes.get("/donations/:id", ...donationsSection, adminController.getDonationDetails);
adminRoutes.post("/donations", ...donationsSection, middleware.validateJoi(donationSchema), adminController.saveDonation);
adminRoutes.put("/donations/:id", ...donationsSection, middleware.validateJoi(donationSchema), adminController.saveDonation);
// Body: status (success = verified | pending | rejected). A member donor is notified
adminRoutes.put("/donations/:id/status", ...donationsSection, middleware.validateJoi(donationStatusSchema), adminController.setDonationStatus);
adminRoutes.delete("/donations/:id", ...donationsSection, adminController.deleteDonation);

// ---------- Expenses (cash-book "paid" rows) ----------
adminRoutes.get("/expenses", ...expensesSection, middleware.validateJoi(expenseListSchema, true), adminController.getExpenses);
adminRoutes.get("/expenses/:id", ...expensesSection, adminController.getExpenseDetails);
adminRoutes.post("/expenses", ...expensesSection, middleware.validateJoi(expenseSchema), adminController.saveExpense);
adminRoutes.put("/expenses/:id", ...expensesSection, middleware.validateJoi(expenseSchema), adminController.saveExpense);
// Body: status (verified | pending | rejected). Only verified expenses count in totals and reports
adminRoutes.put("/expenses/:id/status", ...expensesSection, middleware.validateJoi(expenseStatusSchema), adminController.setExpenseStatus);
adminRoutes.delete("/expenses/:id", ...expensesSection, adminController.deleteExpense);

// ---------- Financial reports ----------
// The Financial Overview: totals with trends, monthly chart, latest transactions. ?from_date=&to_date=
adminRoutes.get("/finance", ...reportsSection, middleware.validateJoi(financeSchema, true), adminController.getFinanceOverview);
// The "Generated Reports" history (the panel builds the file in the browser from GET /reports/data/:type)
adminRoutes.get("/reports", ...reportsSection, middleware.validateJoi(reportListSchema, true), adminController.getReports);
adminRoutes.post("/reports", ...reportsSection, middleware.validateJoi(reportSaveSchema), adminController.saveReport);
adminRoutes.delete("/reports/:id", ...reportsSection, adminController.deleteReport);
// Rows of one report (summary | donation | expense | category | monthly | custom). Lists are paged
adminRoutes.get("/reports/data/:type", ...reportsSection, middleware.validateJoi(reportDataSchema, true), adminController.getReportData);

// ---------- App settings ----------
adminRoutes.get("/settings", ...settingsSection, adminController.getAppSettings);
// Database backup (every table as SQL): the Super Admin only
adminRoutes.get("/backup", superAdmin, adminController.getBackup);
// Only what changes. event_categories = [{ id?, name }] (the full list); upi = { payee_name, upi_id, … } or null
adminRoutes.put("/settings", ...settingsSection, middleware.validateJoi(settingsSchema), adminController.saveAppSettings);

export default adminRoutes;
