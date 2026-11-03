# Gaamtoda Mitra Mandal – Backend API

Node.js + Express + MySQL backend for the Society Android app and the Super Admin web panel.

## Run

```bash
npm install
npm run dev        # nodemon server.js, default port 5020
```

### Required `.env` keys

| Key | Purpose |
| --- | --- |
| `PORT` | Server port (default 5020) |
| `API_KEY` | Value every client must send in the `api-key` header |
| `JWT_WEB_TOKEN` | JWT signing secret |
| `KEY`, `IV` | 16-character AES key and IV for encrypted request bodies |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST` | Email OTP |
| `APP_NAME`, `BASE_URL` | Optional: name used in OTP emails, public URL for `/uploads` |

## Request headers

| Header | Required | Notes |
| --- | --- | --- |
| `api-key` | Always | Must match `API_KEY` |
| `token` or `Authorization: Bearer <jwt>` | Protected routes | Not needed for routes in `bypassRoutes` (middleware.js) |
| `Accept-Language` | Optional | `en` (default), `hi`, `gu` – response `message` is translated |

## Request body

- `application/json` – plain JSON.
- `text/plain` – AES-CBC encrypted JSON string (same scheme as `enc_dec.html`), decrypted by `middleware.decryption`.
- `multipart/form-data` – file uploads (`complete-profile`, `edit-profile` → field `profile_image`).

## Response shape

```json
{ "code": 1, "message": "Login successful", "data": {} }
```

| `code` | Meaning |
| --- | --- |
| `1` | Success |
| `0` | Error |
| `2` | Required fields missing (Joi errors in `data`) |
| `3` | No data found |
| `-1` | Invalid / missing token or API key (HTTP 401) |

HTTP 403 with `code: 0` = logged in but role not allowed.

## Roles

All roles live in `users` (`role_id` → `roles.id`) with their devices in `user_devices`. The `role` in the JWT is `roles.code`: `super_admin`, `executive` or `member`.

`tokenMiddleware` verifies the JWT, checks the device row and re-reads the role from the database, then sets `req.loginUser`.
Protect a route with `allowedRoles` after that:

```js
router.post("/event/add",
  middleware.allowedRoles("super_admin", "executive"),
  middleware.validateJoi(addEventSchema),
  eventController.addEvent);
```

## Adding a language string

Add the key to all three files in `languages/` (`en.js`, `hn.js`, `guj.js`) and pass the key to `middleware.sendApiResponse`.

## Database

The code runs against the existing `society_app` schema. API field names differ from some column names:

| API field | Stored in |
| --- | --- |
| `mobile_number` | `users.mobile` |
| `password` | `users.password_hash` (bcrypt) |
| `language` | `users.preferred_language` |
| `username` | `users.full_name` (empty until `/complete-profile`) |
| `is_verified` | `users.email_verified_at` is set |
| `steps` | `users.signup_step`: `otp_pending` = 0, `profile_pending` = 1, `completed` = 2 |
| `address` | `user_profiles.address_line1` |
| `profile_image` | `user_profiles.photo_url` |
| `accept_terms` | `declaration_acceptances` (version in `constant.DECLARATION_VERSION`) |
| `uuid` | `user_devices.device_uid` (generated if not sent) |
| `device_token` | `user_devices.fcm_token` |
| `ip` | `user_devices.last_ip` |

`device_type` and `device_name` are accepted but not stored. The JWT is stored as a SHA-256 hash in `user_devices.refresh_token_hash`; logging out clears it and sets `status` to `logged_out`. OTPs are in `otp_codes`, with `destination` = the email address.

`database/auth_tables.sql` describes an older design and is not used.

## Auth APIs (`/api/v1/auth`)

| Method | Path | Access | Body |
| --- | --- | --- | --- |
| POST | `/signup` | Public | `email`, `country_code` (default `+91`), `mobile_number`, `password`, `confirm_password`, `language` (`en`/`hi`/`gu`) |
| POST | `/send-otp` | Public | `otp_purpose`, plus `email` (`signup`) or `country_code` + `mobile_number` (`login`) – also used for "Resend OTP" |
| POST | `/verify-otp` | Public | `otp` (6 digits), `otp_purpose`, `country_code`, `mobile_number`, plus `email`, `password`, `language` (`signup`), device fields |
| POST | `/login` | Public | `email` **or** `mobile_number` (+ `country_code`), `password`, device fields |
| PUT | `/complete-profile` | executive, member | multipart: `profile_image?` (JPG/PNG ≤ 2MB), `username`, `address` (max 256), `accept_terms` = `1` |
| PUT | `/edit-profile` | Any logged-in user | multipart or JSON, all optional: `profile_image`, `username`, `address`, `email`. `mobile_number` and `country_code` are refused |
| POST | `/verify-email-change` | Any logged-in user | `email`, `otp` |
| PUT | `/change-password` | Any logged-in user | `old_password`, `new_password`, `confirm_password` (this device stays logged in, all others are logged out) |
| DELETE | `/logout` | Token in header | – (this device only: clears its token and FCM token, marks it inactive) |

Device fields (optional): `device_token` (FCM), `device_type`, `device_name`, `device_model`, `os_version`, `uuid`, `ip`.

### Sign-up flow (matches the app screens)

Nothing is saved in `users` and no token is generated until the OTP is verified. Until then the app keeps the details on the device; only the OTP itself is stored, in `otp_codes`.

1. **Personal Details** → `POST /signup` → OTP mailed to the email (`steps` 0).
2. **Verify OTP** → `POST /verify-otp` with `otp`, `otp_purpose: "signup"` and the same `email`, `country_code`, `mobile_number`, `password`, `language` → creates the user (`steps` 1) and returns `token`, `code: 5`. The app should clear its saved copy of the details at this point.
   "Resend OTP" → `POST /send-otp` with `email` (allowed once every 60 s).
3. **Profile & Address** → `PUT /complete-profile` with the token → saves `username`, `address` and `profile_image` (`steps` 2) → "Account created successfully".

### Changing email

1. `PUT /edit-profile` with a new `email` → OTP mailed to the new email; the old email stays on the account. Any `username`, `address` or `profile_image` in the same request are saved straight away. Calling it again resends the OTP (allowed once every 60 s).
2. `POST /verify-email-change` with `email` and `otp` → the email is updated.

Sending the account's current email is not a change: no OTP and no error. These OTPs are stored with `purpose` = `email_change` and the `user_id` that requested them; run `database/otp_email_change_purpose.sql` once on each database to add that value.

A new `profile_image` replaces the old one, and the old file is deleted from `uploads/`.

### Login flow

- **Mobile / Email tab** → `POST /login`.
- **Login with OTP tab** → `POST /send-otp` (`otp_purpose: "login"`) → `POST /verify-otp`.

`code` in the login / verify-otp response tells the app which screen to open:

| `code` | Screen |
| --- | --- |
| `1` | Home (token returned) |
| `5` | Profile & Address screen (token returned) |

OTP is 6 digits, valid for 5 minutes, and is mailed to the account's email (login OTPs too). After 5 wrong attempts it is blocked and a new OTP must be requested. When `NODE_ENV` is not `production`, the OTP is always `123456`.
