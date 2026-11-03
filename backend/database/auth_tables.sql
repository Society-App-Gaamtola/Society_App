-- Tables used by the auth APIs (signup / login / OTP / devices)
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS tbl_user (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role              ENUM('executive', 'member') NOT NULL DEFAULT 'member',
  name              VARCHAR(100) NULL,
  email             VARCHAR(150) NULL,
  country_code      VARCHAR(5)   NOT NULL DEFAULT '+91',
  mobile_number     VARCHAR(15)  NOT NULL,
  password          VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  profile_image     VARCHAR(255) NULL,
  address           TEXT         NULL,
  language          ENUM('en', 'hi', 'gu') NOT NULL DEFAULT 'en',
  is_verified       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = mobile verified by OTP',
  steps             TINYINT      NOT NULL DEFAULT 1 COMMENT '1 = personal details, 2 = profile & address done',
  terms_accepted_at DATETIME     NULL,
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  is_delete         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_mobile (country_code, mobile_number),
  KEY idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_user_device (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  token        VARCHAR(512) NULL COMMENT 'JWT, NULL after logout',
  device_token VARCHAR(255) NULL COMMENT 'FCM push token',
  device_type  VARCHAR(20)  NULL,
  device_name  VARCHAR(100) NULL,
  device_model VARCHAR(100) NULL,
  os_version   VARCHAR(50)  NULL,
  uuid         VARCHAR(100) NULL,
  ip           VARCHAR(45)  NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  is_delete    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_device_user (user_id, uuid),
  KEY idx_user_device_token (token),
  CONSTRAINT fk_user_device_user FOREIGN KEY (user_id) REFERENCES tbl_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_admin (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  country_code  VARCHAR(5)   NOT NULL DEFAULT '+91',
  mobile_number VARCHAR(15)  NULL,
  password      VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  is_delete     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_admin_device (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED NOT NULL,
  token       VARCHAR(512) NULL,
  device_type VARCHAR(20)  NULL,
  ip          VARCHAR(45)  NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  is_delete   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_device_token (token),
  CONSTRAINT fk_admin_device_admin FOREIGN KEY (admin_id) REFERENCES tbl_admin (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_otp (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  country_code  VARCHAR(5)   NULL,
  mobile_number VARCHAR(15)  NULL,
  email         VARCHAR(150) NULL,
  otp           VARCHAR(6)   NOT NULL,
  otp_purpose   VARCHAR(30)  NOT NULL COMMENT 'signup | login',
  expires_at    DATETIME     NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '0 = used or replaced',
  is_delete     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otp_mobile (country_code, mobile_number, otp_purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
