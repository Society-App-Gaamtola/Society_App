import express from "express";
import authController from "../controllers/authController.js";
import middleware from "../../../middleware/middleware.js";
import schemas from "../validation_rules/authValidation.js";
import upload from "../../../config/multer.js";

const {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  completeProfileSchema,
  editProfileSchema,
  verifyEmailChangeSchema,
  changePasswordSchema,
} = schemas;

const authRoutes = express.Router();

// Public (listed in bypassRoutes)
authRoutes.post("/signup", middleware.validateJoi(signupSchema), authController.signUp);

authRoutes.post("/login", middleware.validateJoi(loginSchema), authController.login);

authRoutes.post("/send-otp", middleware.validateJoi(sendOtpSchema), authController.sendOtp);

authRoutes.post("/verify-otp", middleware.validateJoi(verifyOtpSchema), authController.verifyOtp);

authRoutes.delete("/logout", authController.logout);

// Logged-in app users (Executive / Member)
authRoutes.put(
  "/complete-profile",
  middleware.allowedRoles("executive", "member"),
  upload.single("profile_image"),
  middleware.validateJoi(completeProfileSchema),
  authController.completeProfile,
);

// Any logged-in user, on their own account
// allowEmpty: a request with only a profile_image has no body fields
authRoutes.put(
  "/edit-profile",
  upload.single("profile_image"),
  middleware.validateJoi(editProfileSchema, true),
  authController.editProfile,
);

authRoutes.post("/verify-email-change", middleware.validateJoi(verifyEmailChangeSchema), authController.verifyEmailChange);

authRoutes.put("/change-password", middleware.validateJoi(changePasswordSchema), authController.changePassword);

export default authRoutes;
