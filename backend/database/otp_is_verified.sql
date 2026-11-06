-- Marks an OTP as verified, so the same OTP can't be verified twice.
-- Run once on every database (local copy already done). Required before deploying the code that uses it.
ALTER TABLE otp_codes
  ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER attempts;

UPDATE otp_codes SET is_verified = 1 WHERE used_at IS NOT NULL;
