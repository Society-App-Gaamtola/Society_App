import Joi from "joi";
import constant from "../../../config/constant.js";

const countryCode = Joi.string().trim().pattern(/^\+\d{1,4}$/).default("+91");
const mobileNumber = Joi.string().trim().pattern(/^\d{7,15}$/);
const otpPurpose = Joi.string().valid("signup", "login").required();
const email = Joi.string().trim().lowercase().email();
const newPassword = Joi.string().min(6).max(64);
const language = Joi.string().valid(...constant.LANGUAGES).default("en");
const username = Joi.string().trim().min(2).max(100);
const address = Joi.string().trim().max(256);
const otp = Joi.number().integer().min(100000).max(999999).required();

const requiredForSignup = { is: "signup", then: Joi.required() };

// Device info is saved with the token (device_token is the FCM push token)
const deviceFields = {
  device_token: Joi.string().trim().max(512).allow(null, ""),
  device_type: Joi.string().trim().allow(null, ""),
  device_name: Joi.string().trim().allow(null, ""),
  device_model: Joi.string().trim().max(128).allow(null, ""),
  os_version: Joi.string().trim().max(32).allow(null, ""),
  uuid: Joi.string().trim().max(128).allow(null, ""),
  ip: Joi.string().trim().max(64).allow(null, ""),
};

// Signup step 0 – Personal Details (OTP is sent to the email)
const signupSchema = Joi.object({
  email: email.required(),
  country_code: countryCode,
  mobile_number: mobileNumber.required(),
  password: newPassword.required(),
  confirm_password: Joi.string().valid(Joi.ref("password")).required()
    .messages({ "any.only": "confirm_password must match password" }),
  language,
});

// Login with password – email OR mobile number
const loginSchema = Joi.object({
  email,
  country_code: countryCode,
  mobile_number: mobileNumber,
  password: Joi.string().required(),
  ...deviceFields,
}).xor("email", "mobile_number");

// "Login with OTP" and "Resend OTP"
// Resending a sign-up OTP needs only the email, login OTPs are found by mobile number
const sendOtpSchema = Joi.object({
  email: email.when("otp_purpose", requiredForSignup),
  country_code: countryCode,
  mobile_number: mobileNumber.when("otp_purpose", { is: "login", then: Joi.required() }),
  otp_purpose: otpPurpose,
});

// On sign-up the app sends the step 1 details again: the user is created from them here
const verifyOtpSchema = Joi.object({
  email: email.when("otp_purpose", requiredForSignup),
  country_code: countryCode,
  mobile_number: mobileNumber.required(),
  password: newPassword.when("otp_purpose", requiredForSignup),
  language,
  otp,
  otp_purpose: otpPurpose,
  ...deviceFields,
});

// Signup step 1 → 2 – Profile & Address (multipart, profile_image file is optional)
const completeProfileSchema = Joi.object({
  username: username.required(),
  address: address.required(),
  accept_terms: Joi.boolean().truthy(1, "1").valid(true).required(),
});

// Every field is optional (multipart, profile_image file too). The mobile number can't be changed
const editProfileSchema = Joi.object({
  username,
  address,
  email,
  country_code: Joi.forbidden().messages({ "any.unknown": "country_code cannot be changed" }),
  mobile_number: Joi.forbidden().messages({ "any.unknown": "mobile_number cannot be changed" }),
});

const verifyEmailChangeSchema = Joi.object({
  email: email.required(),
  otp,
});

const changePasswordSchema = Joi.object({
  old_password: Joi.string().required(),
  new_password: newPassword.invalid(Joi.ref("old_password")).required()
    .messages({ "any.invalid": "new_password must be different from old_password" }),
  confirm_password: Joi.string().valid(Joi.ref("new_password")).required()
    .messages({ "any.only": "confirm_password must match new_password" }),
});

export default {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  completeProfileSchema,
  editProfileSchema,
  verifyEmailChangeSchema,
  changePasswordSchema,
};
