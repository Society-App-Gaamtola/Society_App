-- Adds a separate OTP purpose for changing the email from Edit Profile.
-- Run once on every database (local copy already done). Required before deploying the code that uses it.
ALTER TABLE otp_codes
  MODIFY purpose ENUM('signup', 'login', 'reset_password', 'email_change') NOT NULL;
