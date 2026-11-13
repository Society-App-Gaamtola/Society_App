import Joi from "joi";
import constant from "../../../config/constant.js";
import { mediaUrl } from "./userValidation.js";

const countryCode = Joi.string().trim().pattern(/^\+\d{1,4}$/).default(constant.DEFAULT_COUNTRY_CODE);
const mobileNumber = Joi.string().trim().pattern(/^\d{7,15}$/);
const otpPurpose = Joi.string().valid(constant.OTP_PURPOSE.SIGNUP, constant.OTP_PURPOSE.LOGIN).required();
const email = Joi.string().trim().lowercase().email();
const newPassword = Joi.string().min(constant.PASSWORD_MIN_LENGTH).max(constant.PASSWORD_MAX_LENGTH);
const language = Joi.string().valid(...constant.LANGUAGES).default(constant.DEFAULT_LANGUAGE);
const username = Joi.string().trim().min(constant.USERNAME_MIN_LENGTH).max(constant.USERNAME_MAX_LENGTH);
const address = Joi.string().trim().max(constant.ADDRESS_MAX_LENGTH);
const otp = Joi.number().integer().min(100000).max(999999).required();

const requiredForSignup = { is: constant.OTP_PURPOSE.SIGNUP, then: Joi.required() };

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

// "Login with OTP" and "Resend OTP". The code always goes to an email:
// sign-up → the email being registered; login → the account's email, found by email
// (or by mobile number, sent by older app versions)
const sendOtpSchema = Joi.object({
  email: email.when("otp_purpose", requiredForSignup),
  country_code: countryCode,
  mobile_number: mobileNumber,
  otp_purpose: otpPurpose,
}).or("email", "mobile_number");

// On sign-up the app sends the step 1 details again: the user is created from them here
// Login: the same email (or mobile number) the code was requested with
const verifyOtpSchema = Joi.object({
  email: email.when("otp_purpose", requiredForSignup),
  country_code: countryCode,
  mobile_number: mobileNumber.when("otp_purpose", requiredForSignup),
  password: newPassword.when("otp_purpose", requiredForSignup),
  language,
  otp,
  otp_purpose: otpPurpose,
  ...deviceFields,
}).or("email", "mobile_number");

// Signup step 1 → 2 – Profile & Address (multipart, profile_image file is optional)
// profile_image_url: the photo the app uploaded to Cloudinary (older app versions send a profile_image file)
const completeProfileSchema = Joi.object({
  username: username.required(),
  address: address.required(),
  accept_terms: Joi.boolean().truthy(1, "1").valid(true).required(),
  profile_image_url: mediaUrl,
});

// Every field is optional (multipart, profile_image file too). The mobile number can't be changed
const editProfileSchema = Joi.object({
  username,
  address,
  email,
  profile_image_url: mediaUrl,
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
