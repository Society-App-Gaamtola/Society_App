# Society App – project guide for Claude

Gaamtoda / Shri Gamtola Yuvak Mitra Mandal society app. Read this file first: it holds what is needed to work on the
project without scanning every folder. Keep it up to date when you add an API, a table or a rule.

| Folder | What it is |
| --- | --- |
| `backend/` | Node.js (ES modules) + Express 5 + **PostgreSQL** API. Port 5020 |
| `frontend/mobile/` | Expo / React Native app for members and executives (Android) |
| `frontend/admin/` | Next.js 14 Super Admin panel. **Every screen uses the backend** (Login, Dashboard, Members, Events & Notices, Executives, Media Approval, Donations, Expenses, Financial Reports, App Settings, My Profile). There is no demo data in the panel any more |

## Rules to always follow

1. **Settings live in `backend/config/constant.js`**: limits, lengths, timings, statuses, role codes, schedules, error
   codes. Never hard-code them in modules. Secrets and per-machine values stay in `.env`.
2. **Keep the backend simple**: few helpers, no new layers or libraries unless asked. Reuse `common`, `query` and `middleware`.
3. **Languages in the database.**
   - **Fixed app text** (categories, messages, labels) is never stored per language. It lives in `backend/languages/`
     (and the app's `src/i18n`) and is looked up with `common.translate()` / `t()`. Categories use the key `category_<code>`.
   - **Content typed by people** (event `title` / `description` / `venue_name` / `venue_address`, notice `title` /
     `body`: `constant.TRANSLATABLE`) is stored once in its own table, as typed.
   - Its Gujarati and Hindi copies go in **`content_translations`** (one row per item × language × field). There is
     **no automatic translation** (Google Translate was removed on 2026-11-17): rows are stored in the database, and
     a language with no row shows the original text.
   - Never add `title_gu` / `name_hi`-style columns. To translate a new kind of content, add it to `TRANSLATABLE` and use
     `translatedColumns()` / `translationJoin()` in its list query.
   - One exception: the society's Gujarati name is the setting `society_name_gu` (App Settings → General). There is one
     society name, not a table of rows; the app and the panel header show it.
4. **There is no mobile-number verification.** Only the email is verified, by OTP (`users.email_verified_at`). Don't add
   `mobile_verified_at` or any mobile OTP flow. The mobile number is only stored and must be unique.
5. **Write PostgreSQL SQL** (see "Database"). The project moved from MySQL on 2026-11-16.
6. **Every user message is a language key**, never an English sentence in code: add the key to `en.js`, `hn.js` and
   `guj.js` together.
7. **Mobile app**: use `src/theme.ts` (maroon `#7A1020` + gold) and the shared `src/components/`. Check with
   `npx tsc --noEmit` (there is no ESLint).
   - **All app text is translated (gu / hi / en)** with `t()` from `src/i18n`. The key is the English text:
     `t('Upload Photos / Videos')`, and values go in braces: `t('Pay {amount} with UPI App', { amount })`.
   - Add the Gujarati and Hindi lines to `src/i18n/translations.ts`. A missing line falls back to English, never to blank.
   - In components call `const t = useT();`, which re-renders on a language change. Outside components (utils, alerts
     in helpers) use the plain `t`.
   - Shared components already translate their own text props: Pill / StatusBadge labels, FilterChips options,
     PrimaryButton / OutlineButton titles, FormField label and error, InputField / SearchBar placeholders, MenuGroup
     items, EmptyState, ActionSheet / SelectSheet, StepIndicator, SegmentedTabs. So pass them the English text.
   - Wrap the rest yourself: your own `<Text>` children, alert texts, template sentences.
   - Never translate data from the database (event titles, names).
   - Dates come from `formatDate` / `timeAgo` in the app language. `setAppLanguage()` (picker, Settings, Profile →
     Language) switches the whole app live, and `usePagedList` reloads in the new language.
   - Every screen wraps its text in `t()` and every line has its Gujarati / Hindi copy (checked 2026-11-23). To find
     text without a line, scan the `t('…')` calls and the shared components' text props against `translations.ts`.
   - The society's names, notice categories and social links come from `services/appInfo.ts` (`useAppInfo()` in
     components, `getSocietyInfo()` in services such as receipts, reports and share text). It is saved on the phone and
     refreshed after login, on profile reload and when the side menu opens. Never hard-code the society name.
   - **Dark theme**: `src/theme.ts` has a light and a dark palette (black background, near-black cards, off-white text,
     brighter accents).
     - `colors.x` / `tones.x` always return the active theme's value. Build styles with
       `const styles = themedStyles(() => ({ ... }))`, never `StyleSheet.create`.
     - Never put a hard-coded hex in a screen; add a token to both palettes. `colors.card` is a white surface in light
       mode; `colors.white` is only for text and icons on maroon or photos.
     - Don't read `colors.x` in module-level constants (it would be frozen in the light theme). Use a function or a
       getter instead (see `surface` in styles/common.ts).
     - **Header** (`AppHeader`, every screen after login): menu / back, then the logo and the society name on the left;
       the theme button, bell and avatar on the right.
     - The toggle is the sun/moon button in `AppHeader` (`setThemeMode`). It's saved on the phone;
       App.tsx redraws everything under a theme key, and RootNavigator keeps the open screen.
8. **Role checks happen in the route, never in the controller or module.** Put `middleware.allowedRoles(...)` first on
   every protected route, before multer, `validateJoi` and the controller. It reads the role tokenMiddleware already put
   on `req.loginUser`, so it costs no database query. A wrong role gets HTTP 403 (code 0) straight away. Don't write
   `if (role !== ...) return 403` in modules, and don't look up `executive_permissions` per request. The module may
   only:
   - check **ownership** (the row's `created_by` / `uploaded_by` vs `req.loginUser.id`), which needs the row anyway;
   - pick **role-based behaviour** with `common.hasRole(req.loginUser, constant.X_ROLES)` (no query), e.g.
     auto-publish, or "see everyone's items".
9. Don't commit or push unless asked.

## Run locally

```powershell
cd backend; npm run dev            # nodemon, http://localhost:5020/api/v1 (uses the LIVE Neon database)
cd frontend\mobile; npx expo start -c   # the app's .env must point at http://<PC Wi-Fi IP>:5020/api/v1
cd frontend\admin; npm run dev     # http://localhost:3000 (needs the backend running)
```

- **There is no local database (removed 2026-11-19).** The only database is the live **Neon PostgreSQL 18**
  (project `society-app`, branch `production`, region AWS Singapore, free plan, database `neondb`, time zone
  Asia/Kolkata). `backend/.env` holds its `DATABASE_URL` (direct connection, **not** the `-pooler` host: the
  `-c TimeZone` startup option in `db.js` needs it). Neon keeps 6 hours of restore history only.
- **Everything you run touches real data.** Never run `demo_data.sql`, `sample_events_notices.sql` or load tests on it;
  delete any test row you create. Schema changes: run the SQL on Neon (psql with the `DATABASE_URL`) and add it to `schema.sql`.
- View the data in the Neon console (Tables) or pgAdmin 4 with the Neon host, user `neondb_owner`, SSL required.
- Super Admin (panel login): `superadmin@gaamtoda.com` (renamed from `…@gaamtola.com` on 2026-11-23, client review R2;
  placeholder mobile `0000000000`). The live data came from the old
  Aiven MySQL on 2026-11-19 (`copy_mysql_to_postgres.js`, then `seed.sql` for the newer categories / modules).
- Outside `NODE_ENV=production` every OTP is **`123456`** (`constant.DEV_OTP`), also for live accounts when the backend
  runs on this PC. Mail is still sent when `.env` has SMTP / Brevo settings; start with
  `SMTP_USER= BREVO_API_KEY= MAIL_FROM=` to turn mail off while testing.
- Local `api-key`: the `API_KEY` value in `backend/.env`.
- Mobile `.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_KEY`). The Render settings are saved in `.env.render-backup.local`.
- **Render (backend hosting)**: `https://society-app-sg.onrender.com` (Singapore), on Neon (`backend/.env.production`,
  checked 2026-11-24). The free plan sleeps: the first request after a quiet spell can take ~1 minute.
- **Test APK (EAS Build)**, from `frontend/mobile` (EAS account `milanpatel1212`, project `@milanpatel1212/kartikmaji_gaamtoda`,
  Android package `com.gaamtoda.society`; the keystore is kept by Expo):
  `npx eas-cli@latest build -p android --profile preview`. The `preview` profile (`eas.json`) builds an installable APK
  against Render: `EXPO_PUBLIC_API_URL` is in `eas.json`, `EXPO_PUBLIC_API_KEY` is an EAS `preview` variable
  (`eas env:set`). The local `.env` is gitignored, so it never reaches the build. The build page has the APK link / QR.
  - **R8 (code shrinking) is off** (`expo-build-properties` → `enableMinifyInReleaseBuilds: false` in `app.json`). With
    it on, the APK closed at start-up: WorkManager (from `react-native-maps`) could not build its Room database because
    R8 removed `WorkDatabase_Impl`'s constructor ("Failed to create an instance of class androidx.work.impl.WorkDatabase").
    The `extraProguardRules` keep rule there fixes that if R8 is turned on again (e.g. for the Play Store); test the APK
    on a phone before sending it.
  - **APK size** (`expo-build-properties` in `app.json`, 2026-11-27: 105 MB → ~45 MB): `buildArchs` is only
    `armeabi-v7a` + `arm64-v8a` (real phones; `x86` / `x86_64` are emulators only and were ~42 MB), and
    `useLegacyPackaging: true` compresses the native libraries inside the APK. The Play Store needs an `.aab` instead
    (it sends each phone only its own part).
  - A JavaScript error in a built app shows `AppErrorBoundary` (error text + Try Again) instead of closing the app.
    A native crash still closes it: read it with `adb logcat` (Android platform-tools, phone with USB debugging).

## Backend structure

```
backend/
  server.js                    middleware order + routes + error handler + DB check + cron start
  config/
    constant.js                ALL settings (see rule 1)
    db.js                      pg Pool; db.query(sql, params) with ? placeholders (see Database)
    dbHelper.js                query.insertQuery / updateQuery / upsertQuery, query.fetchPage (every list)
    common.js                  getUserDetails, checkunique, sanitizeUser, generateToken, translate, mediaUrl,
                               isInMediaFolder, hashToken, likeText (ILIKE search text), sendOtpMail,
                               sendNotification (the one way to notify), notifyNewContent, deleteUpload
    status_codes.js            Codes (HTTP + response codes)
    mail.js                    OTP email HTML template
    multer.js                  uploads/ disk storage (legacy profile_image file)
    cron.js                    every 24 hours (midnight) + once on start: OTP cleanup; scheduled events →
                               posted, then common.notifyNewContent() (new event / notice notifications);
                               1 AM: read notifications older than NOTIFICATION_READ_KEEP_DAYS (30) deleted;
                               1:30 AM: members' UPI donations still without a UTR after
                               DONATION_UNPAID_KEEP_HOURS (48) soft-deleted (never paid)
  middleware/middleware.js     checkApi, decryption, tokenMiddleware, allowedRoles, validateJoi,
                               sendSuccess / sendError / sendServerError / sendApiResponse, extractHeaderLanguage
  languages/en.js hn.js guj.js message keys (en / hi / gu)
  modules/v1/
    routes/<area>Route.js      URL → [allowedRoles] → [multer] → validateJoi(schema) → controller
                               areas: auth (login/profile), user (events, notices, gallery: one URL per item for
                               every role, writes limited by allowedRoles), executive (Super Admin: member roles and
                               executive requests), admin (panel login + dashboard)
    validation_rules/<area>Validation.js   Joi schemas
    controllers/<area>Controller.js        one-line pass-through to the module
    module/<area>Module.js                 all logic + SQL
  database/
    schema.sql                 all 26 tables (PostgreSQL)
    seed.sql                   roles, modules, event_categories, app_settings
    sample_events_notices.sql  optional dev data (deletes + re-adds the sample rows)
    copy_mysql_to_postgres.js  one-time MySQL → PostgreSQL row copy
```

### Request pipeline (server.js, in this order)

1. `cors` (origin `ADMIN_PANEL_URL`), JSON / urlencoded / `text/plain` body parsers
2. `extractHeaderLanguage`: `Accept-Language` → `req.lang` = `en` | `hi` | `gu` (default `en`)
3. `/uploads` static files
4. `checkApi`: header `api-key` must equal `API_KEY`, otherwise HTTP 401, code -1
5. `decryption`: a `text/plain` body is AES-CBC encrypted JSON (KEY/IV in `.env`, see `enc_dec.html`). JSON and
   multipart bodies pass through
6. `tokenMiddleware`: skipped for `constant.BYPASS_ROUTES`. Reads `token` or `Authorization: Bearer <jwt>`, verifies the
   JWT, then in **one query** requires an active `user_devices` row whose `refresh_token_hash` = sha256(token),
   re-reads the user's status and role (and an executive's permission sections), and checks
   **the role the token was issued for** (JWT `role` = `user_devices.role`) is still the user's role; otherwise HTTP
   401 `rest_role_changed_login_again`. Sets `req.loginUser = { id, role, name, email, country_code, mobile_number }`.
   Then each route's `allowedRoles` checks that role (no query). Keep it to one query: it runs on every request.

Before all of this: `app.set("trust proxy", 1)` (Render's proxy) and `GET /health` → `{ status: "ok", uptime_seconds }`
(no api-key, no token, no rate limit, **never a database query**). It is the wake-up / keep-awake route for Render's
health check and an uptime monitor (a ping every 10 minutes keeps the free plan awake; Neon can still sleep).

**Rate limits** on the public auth routes (`middleware.authLimits`, `express-rate-limit`, settings in
`constant.RATE_LIMITS`). The counts are in the server's memory, never the database, and a refused request stops
before `validateJoi` / the module. Too many → **HTTP 429**, code 0, `rest_too_many_requests`, `data: { retry_after_seconds }`.
- `ip` (`AUTH_IP`, 100 / 15 min per IP, all routes together): on signup, login, send-otp, verify-otp, admin login.
- `login` (10 / 15 min), `otpSend` (5 / hour: signup, send-otp), `otpVerify` (10 / 15 min). Each counts per
  IP + email / mobile, so other users on the same network aren't blocked. `/auth/login` and `/admin/login` share one count.
- The counts reset when the server restarts, and each server keeps its own (one server today).
- In a route the limiters come first: `router.post("/login", authLimits.ip, authLimits.login, validateJoi(...), ...)`.

Load safety (do not remove):
- `db.js`: the pool has an `error` listener. Neon closes idle connections, and without the listener Node would crash.
- Pool limits (`constant.DB_POOL_MAX` 20, `DB_POOL_MAX` env to change; `DB_CONNECT_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`):
  a request never waits forever for a connection, and a runaway query is stopped.
- `server.js`: an `unhandledRejection` is logged, not fatal, and SIGTERM (a Render redeploy) lets open requests finish
  before the pool closes.
7. Routes: `/api/v1/auth/*`, `/api/v1/user/*`, `/api/v1/executive/*`, `/api/v1/admin/*`
8. Error handler: multer error → `rest_invalid_file`; bad JSON → `rest_invalid_request_payload`; else 500

## API response pattern

Every response is HTTP 200 with this body, unless noted otherwise:

```json
{ "code": 1, "message": "<translated text>", "data": { } }
```

`data` is left out when there is nothing to return. `message` is translated from a language key into `req.lang`.

| `code` | Meaning | Sent by |
| --- | --- | --- |
| `1` | Success | `middleware.sendSuccess(res, key, data)` |
| `0` | Error the user can fix (not found, wrong password, …) | `middleware.sendError(res, key, data)` |
| `2` | Joi validation failed. `data` = `{ field: "message" }` | `validateJoi` |
| `3` | No data found (constant exists, rarely used) | `sendApiResponse(..., Codes.NO_DATA_FOUND, ...)` |
| `5` | Logged in but profile not finished → app opens Profile & Address (token returned) | `authModule.sendLoginResponse` |
| `-1` | Missing/invalid API key or token, logged out device, inactive account. **HTTP 401** | `checkApi`, `tokenMiddleware` |
| `0` + **HTTP 403** | Logged in but the role is not allowed | `allowedRoles` |
| `0` + **HTTP 429** | Too many login / sign-up / OTP requests (rate limit). `data` = `{ retry_after_seconds }` | `middleware.authLimits` |
| `0` + **HTTP 500** | Unexpected error (logged with the function name) | `middleware.sendServerError(res, "fnName", error)` |

Lists always return `{ <items>: [...], pagination }`, where
`pagination = { page, limit, total, total_pages, has_more }`. Query params are `page` (default 1) and `limit`
(default `DEFAULT_PAGE_SIZE` 10, max `MAX_PAGE_SIZE` 50). Use `query.fetchPage()` (`config/dbHelper.js`), which runs the
page and the COUNT together. **Every admin list is paged the same way: never return all rows at once.** Exports read
the list page by page in the browser (`fetchAllPages`, 50 a page) and build the file there, so the server does no
export work.

Dates: `DATE` columns go out as `'YYYY-MM-DD'` (`TO_CHAR`), `TIME` as `'HH:MM:SS'`, timestamps as ISO UTC strings.
Media/photo fields go through `common.mediaUrl()` (a Cloudinary link stays as it is; an old `uploads/` file name gets
`IMAGE_BASE_URL`).

## How to add a new API (recipe)

1. **Settings**: add any limits, statuses or codes to `constant.js`.
2. **Messages**: add new keys (`rest_<thing>_<result>`) to `languages/en.js`, `hn.js`, `guj.js`.
3. **Validation**: add a Joi schema to `validation_rules/<area>Validation.js` and export it. Rules:
   - GET filters come from the query string: use `validateJoi(schema, true)`. The checked values are put on `req.body`.
   - Use `Joi.number()` for ids, `.trim()` strings, `.lowercase()` emails, `Joi.date().iso().raw()` for dates.
   - Reuse `pagination`, `dateRange`, `mediaUrl`, `deviceFields`, `email` and the other shared pieces.
4. **Route**: add it in `routes/<area>Route.js`. A new area gets a new route file mounted in `server.js` as
   `/api/v1/<area>/`. Public routes must also be listed in `constant.BYPASS_ROUTES`.
   - The **role check comes first** (rule 8). The order is: `allowedRoles` → [multer] → `validateJoi` → controller.
   - Define the role sets once at the top of the route file:
   ```js
   const { SUPER_ADMIN, EXECUTIVE } = constant.ROLES;
   const allUsers = middleware.allowedRoles(MEMBER, EXECUTIVE, SUPER_ADMIN);   // read APIs
   const executives = middleware.allowedRoles(SUPER_ADMIN, EXECUTIVE);          // add / edit / delete
   const superAdmin = middleware.allowedRoles(SUPER_ADMIN);                     // panel-only changes

   router.get("/events", allUsers, middleware.validateJoi(eventListSchema, true), controller.getEvents);
   router.post("/events", executives, middleware.validateJoi(eventSchema), controller.createEvent);
   router.put("/events/:id/status", superAdmin, middleware.validateJoi(eventStatusSchema), controller.setEventStatus);
   ```
   - Every `/user` and `/executive` route lists its roles explicitly, even when all of them are allowed (`allUsers`).
     A role not listed (e.g. `guest`) gets 403.
   - **Don't make a second listing API for another role.** Use one list / detail API with all the roles that need it, and
     let the module change what it returns by role (see `getEvents`: `mine` / `status` only work for `CREATOR_ROLES`).
   - **One URL per item.** The add / edit / delete / review APIs of an item go on the same URL as its list
     (`GET` / `POST /user/events`, `PUT` / `DELETE /user/events/:id`, `PUT /user/events/:id/status`), limited by
     `allowedRoles`, not under a separate per-role prefix.
5. **Controller**: add a one-liner, `async createEvent(req, res) { return eventModule.createEvent(req, res); }`.
6. **Module**: put the logic in a try/catch:
   ```js
   async createEvent(request, res) {
       try {
           const user_id = request.loginUser.id;
           const { title, category_id } = request.body;
           const [result] = await query.insertQuery("events", { title, category_id, created_by: user_id });
           return middleware.sendSuccess(res, "rest_event_created", { event: { id: result.insertId } });
       } catch (error) {
           if (error.code === constant.DB_ERROR.FOREIGN_KEY_VIOLATION) {
               return middleware.sendError(res, "rest_category_not_found");
           }
           return middleware.sendServerError(res, "createEvent", error);
       }
   },
   ```
   - Share list logic as `listX({ filters, page, limit, lang, withTotal })`. The detail endpoint calls it with `{ id }`,
     as `listEvents` / `getEventDetails` do.
   - Always filter `is_active = 1 AND is_deleted = 0`. Delete = soft delete (`is_deleted = 1`).
   - Return only the fields the client needs (see `sanitizeUser`); never return `password_hash` or token hashes.
   - Validate `:id` with `routeId(request)` (null → "not found").
7. **Test** with curl or a small node script (see Testing), then update the API list below.

## Database (PostgreSQL 18)

- **Placeholders**: write `?`; `config/db.js` turns them into `$1, $2…`. Never put a literal `?` inside SQL strings.
- **Transactions**: `await db.transaction(async (tx) => { await tx.query(...); await query.insertQuery(t, row, "", tx); })`.
  Every `query.*` helper takes `tx` as its last argument; throwing inside rolls everything back (see `saveNoticeRows`).
- **Content translations** (`config/translator.js`, table `content_translations`):
  - **No outside service:** nothing translates automatically. The Gujarati / Hindi rows are stored in the table
    (`source_hash` is not used any more).
  - **Reading:** the list queries use `translatedColumns()` + `translationJoin()` to return the user's language
    (falling back to the original).
  - **Executive views** (`executiveView`, the owner's own detail) get the original, so they edit and save the original.
  - **Notifications** about an event / notice show its translated title (and a notice's text); system `notify_*` titles
    come from the language files.
  - **No row** for a language → the original is shown, with no errors.
- **Results**: `const [rows] = await db.query(sql, params)` for SELECT. For writes,
  `const [result] = ...` gives `result.affectedRows`, and `result.insertId` (inserts through `query.insertQuery`, which
  adds `RETURNING id`).
- **Helpers** (`config/dbHelper.js`):
  - `query.insertQuery(table, { col: value }, onConflict?)`. Use `"ON CONFLICT (a, b) DO NOTHING"` instead of MySQL `INSERT IGNORE`.
  - `query.updateQuery(table, { col: value } | "col = col + 1", "id = ?", [id])`
  - `query.upsertQuery(table, { ... }, ["user_id"])` replaces `ON DUPLICATE KEY UPDATE`.
  - Never use MySQL's `SET ?`.
- **Postgres syntax**:

  | Use | Instead of |
  | --- | --- |
  | `ILIKE` | `LIKE` (for case-insensitive search) |
  | `CURRENT_DATE` | `CURDATE()` |
  | `NOW() + make_interval(mins => ?::int)` | `DATE_ADD` |
  | `EXTRACT(EPOCH FROM a - b)` | `TIMESTAMPDIFF` |
  | `TO_CHAR(d, 'YYYY-MM-DD')` | `DATE_FORMAT` |
  | `CAST(? AS date)` | `DATE(?)` |
  | `COALESCE` | `IFNULL` |
  | `STRING_AGG` | `GROUP_CONCAT` |

- **Error codes**: `constant.DB_ERROR.UNIQUE_VIOLATION` (`23505`) and `FOREIGN_KEY_VIOLATION` (`23503`). The constraint
  name is in `error.constraint` (e.g. `uq_users_email`, `fk_media_event`).
- **Types**:
  - `BIGINT` ids come back as JS numbers.
  - `NUMERIC` money comes back as a string.
  - Flags are `SMALLINT` 0/1, not boolean.
  - Fixed value lists are `VARCHAR + CHECK`. To add a value, drop the CHECK constraint and add it again.
  - Timestamps are `TIMESTAMPTZ`.
- **Time zone**: each connection runs in `constant.DB_TIME_ZONE` (`Asia/Kolkata`), so `NOW()`, `CURRENT_DATE` and `::date` are IST.
- **New table**:
  - Primary key: `id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`.
  - Columns: `is_active`, `is_deleted`, `created_at`, `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`).
  - Constraints are named `uq_<table>_<cols>` / `fk_<table>_<ref>`.
  - Indexes on the foreign keys.
  - Add the `set_updated_at()` trigger (copy the `CREATE TRIGGER` pattern from the end of `schema.sql`).
  - Add the table to `schema.sql`, and run the same SQL on the local database.
- Table names and column names in SQL come from code, never from the request (`name_${lang}`-style building is gone; see rule 3).

### Tables (24)

| Area | Tables |
| --- | --- |
| Users | `roles` (1 super_admin, 2 executive, 3 member, 4 guest), `users`, `user_profiles` (1 per user, + the notify_events / notify_notices / notify_payments switches), `user_devices` (login sessions), `otp_codes`, `declaration_acceptances` |
| Access | `modules` (events, notices, donations, media, transactions, settings), `executive_permissions` (per user × module: can_view/create/edit/approve) |
| Content | `event_categories` (code, English `name`, color, sort_order), `events` (+ `latitude`/`longitude` pin), `event_images` (several images per event, `sort_order`), `event_volunteers`, `future_event_plans`, `notices`, `notice_recipients`, `media_items` |
| Notifications | `notifications`, `notification_recipients` (per user/device, FCM status) |
| Money | `donations` (+ `donor_name` for non-members, `donated_on`, `proof_url`, `verified_by`), `payments` (gateway), `executive_applications`, `society_transactions` (cash book; `paid` rows = expenses with `category`, `paid_to`, `status`, `bill_url`, `verified_by`), `upi_settings`, `generated_reports` |
| Other | `app_settings` (key/value). There is **no activity log table** (`audit_logs` was dropped on 2026-11-25 to save space) |

Key statuses:
- `events.status`: draft | scheduled | posted | cancelled. Users only see `posted`. **Events and notices need no approval**; only gallery media is approved.
- `notices.status`: draft | published.
- `notices.audience`: all | selected (`notice_recipients`).
- `media_items.status`: pending | approved | rejected.
- `media_items.privacy`: all_members | executives | private.
- `users.signup_step`: otp_pending | profile_pending | completed.
- `users.status`: active | suspended.
- `user_devices.status`: active | blocked | logged_out.

API field ↔ column:

| API field | Column |
| --- | --- |
| `mobile_number` | `users.mobile` |
| `username` | `users.full_name` |
| `language` | `users.preferred_language` |
| `password` | `users.password_hash` (bcrypt) |
| `is_verified` | `email_verified_at` is set |
| `steps` | `signup_step` (0 / 1 / 2) |
| `address` | `user_profiles.address_line1` |
| `profile_image` | `user_profiles.photo_url` |
| `uuid` | `user_devices.device_uid` |
| `device_token` | `user_devices.fcm_token` |
| `role` | `roles.code` |

## Auth & sessions

- **One sign-up and one login for everyone** (no member / executive tabs in the app).
  - Everyone registers as a `member`.
  - The Super Admin makes a member an executive, with `PUT /executive/members/:id/role` or by approving their
    Executive Request. The user keeps the same email and password.
  - A role change ends the user's sessions (`changeRole` logs out their devices; a token for the old role is refused
    anyway). They log in again and get a token for the new role, and the app then shows the executive screens.
  - Nobody can be made `super_admin` through the API (`ASSIGNABLE_ROLES`).
- **Roles**: `constant.ROLES` = `super_admin`, `executive`, `member`. All roles are in `users`.
- **Token**: `common.generateToken(user, request, role?)` makes a JWT for one role (default the user's role; the panel's
  `/admin/login` passes `ROLES.SUPER_ADMIN`), valid `TOKEN_EXPIRY_DAYS` (365). Its session is saved in `user_devices`:
  sha256 of the token (`refresh_token_hash`), `role`, `platform` (`device_type`: android / ios / web), model, OS, IP,
  FCM token. There is one row per (user, device_uid). Logging in again on the same device refreshes that row; a
  `blocked` device stays blocked.
- **Member code**: `common.assignMemberCode(user_id)` gives `GM0001`, `GM0002`… (`MEMBER_CODE_PREFIX` + the next
  `member_code_seq` number) when sign-up is completed (`/complete-profile`). Not for the Super Admin. A code the Super
  Admin typed by hand that matches the next number is skipped.
- **Logout**: applies to this device only (`LOGGED_OUT_DEVICE`). **Change password**: logs out all other devices.
- **OTP**: always sent by email, 6 digits, valid 5 minutes. It can be resent after 60 s and allows 5 attempts. Only the
  newest OTP counts, and `is_verified` stops reuse. Purposes: `signup`, `login`, `email_change`.
- **Signup**:
  1. `/signup` validates and mails the OTP. Nothing is saved yet.
  2. `/verify-otp` (signup) creates the user with `profile_pending` and returns code 5 + token.
  3. `/complete-profile` saves the profile and sets `completed`.
- **Media**: the app uploads straight to Cloudinary (`MEDIA_URL_PREFIX`) and sends the link. The server only checks the
  folder (`common.isInMediaFolder`):
  - `society_app/<production|development>/profiles/user_<id>/`
  - `society_app/<env>/gallery/<yyyy>/<mm>/`

  - `society_app/<env>/events/<yyyy>/<mm>/` (event posters)

  Executive and super_admin uploads are approved at once (`MEDIA_AUTO_APPROVE_ROLES`); member uploads wait for approval.
  PDFs (payment proofs, bills, `finance/` and `proofs/`) need `pdf` in the Cloudinary upload preset's **Allowed
  formats** (and "Allow delivery of PDF and ZIP files" in the account's Security settings). Without it Cloudinary
  answers "Image file format pdf not allowed" and the panel / app show "This file type is not supported" (checked
  2026-11-23: the preset did not allow pdf yet).
- **No login history** (removed 2026-11-25 with `audit_logs`): a login only updates its `user_devices` row (platform,
  model, `last_ip`, `last_seen_at`) and `users.last_login_at`.
- **Roles** (all decided in the routes, rule 8):
  - `/user/*` (events, notices, gallery and the rest):
    - list / details, own gallery items: `allUsers` = member + executive + super_admin;
    - create / edit / delete events and notices: `executives` = super_admin + executive, **plus**
      `requirePermission('events' | 'notices')`;
    - event status / featured: `superAdmin`; gallery moderation: `executives` + `requirePermission('media')`.
  - `/executive/*` (member roles, executive requests): `superAdmin`.
  - Role-based behaviour in the modules, from `req.loginUser` with no query:
    - `CREATOR_ROLES` (super_admin, executive): may send `mine` / `status` to `GET /user/events` and `/user/notices`, and
      get their own unposted items from the detail APIs.
    - `SEE_ALL_ROLES` (super_admin): sees and edits everyone's items; an executive only their own
      (`common.canChange` = owner or Super Admin). `mine=true` limits the Super Admin to their own items.
  - **Executive permissions** (table `executive_permissions`, one row per allowed section of `modules`):
    - Sections: `constant.PERMISSION_SECTIONS` = events, notices, donations, expenses, reports, media, settings.
    - `tokenMiddleware` loads an executive's sections once per request (`common.loadPermissions`, one small query,
      executives only) into `req.loginUser.permissions = { sections }`.
    - In the route, after `allowedRoles`: `middleware.requirePermission(section)`. The Super Admin always passes; an
      executive without the section gets HTTP 403 `rest_permission_denied`. In a module: `common.hasPermission(user, section)`.
    - **Enforced on**: events (create / edit / delete), notices (create / edit / delete / status), media moderation
      (review + the `status` view of `GET /user/media`). Donations, expenses, reports and settings are saved now and
      must use `requirePermission` when their APIs are built.
    - A new executive (role API or approved request) gets `DEFAULT_EXECUTIVE_SECTIONS` (events, notices). Back to
      member → every permission removed (`changeRole` → `common.savePermissions`).

## All APIs (83) – base `/api/v1`

Headers on every call:
- `api-key` (always)
- `token` or `Authorization: Bearer <jwt>` (on everything except the public routes)
- `Accept-Language` (`en`/`hi`/`gu`, optional)

`userData` (returned by the login / profile calls) =
`{ id, role, username, member_code, email, country_code, mobile_number, profile_image, address, language, is_verified, steps, is_active, created_at, updated_at }`.
The app's login (`/auth/login`, `/auth/verify-otp`) and `GET /auth/profile` add
`permissions: { sections }` (`common.userWithPermissions`: an executive's sections, every
section for the Super Admin, none for a member). The app shows only the screens those sections allow, and reloads the
profile on start and when it comes back to the foreground, so a permission change reaches it without a new login.

### Auth – `/auth` (`authRoute.js` → `authModule.js`)

| Method & path | Access | Body | Success `data` |
| --- | --- | --- | --- |
| POST `/signup` | Public | `email, country_code?(+91), mobile_number, password, confirm_password, language?` | `{ email, country_code, mobile_number, steps: 0, resend_after_seconds }`. Error if the email or mobile is taken |
| POST `/send-otp` | Public | `otp_purpose` (signup\|login), `email` (signup) or `email` / `country_code+mobile_number` (login) | `{ resend_after_seconds }`. Code 0 + same data if asked again too soon |
| POST `/verify-otp` | Public | `otp, otp_purpose`. Signup also sends `email, country_code, mobile_number, password, language`; login sends `email` or mobile. Device fields | `{ userData, token }`, code 1, or 5 if the profile isn't finished |
| POST `/login` | Public | `email` **xor** `mobile_number`(+`country_code`), `password`, device fields | `{ userData, token }`, code 1 or 5 |
| DELETE `/logout` | Public route; reads the token | – | – (code 0 if already logged out) |
| PUT `/complete-profile` | executive, member | `username, address, accept_terms=1, profile_image_url?` (or multipart `profile_image`) | `{ userData }` |
| GET `/profile` | any role (also the admin panel) | – | `{ userData }` |
| PUT `/edit-profile` | any role | all optional: `username, address, email, profile_image_url`; `mobile_number` and `country_code` are refused | `{ userData }`, or with a new email `{ userData, new_email, resend_after_seconds }` (OTP mailed) |
| POST `/verify-email-change` | any role | `email, otp` | `{ userData }` |
| PUT `/change-password` | any role | `old_password, new_password, confirm_password` | – . Logs out the user's other devices |

Device fields (all optional): `device_token` (FCM), `device_type`, `device_name`, `device_model`, `os_version`, `uuid`, `ip`.

### User – `/user` (`userRoute.js` → `userModule.js`; writes → `executiveModule.js`)

**One URL per item for every role.** Events, notices and gallery have a single list / detail API for member,
executive and Super Admin (the module changes what it returns by role), and their add / edit / delete / review APIs
live on the same URLs, with the role checked first in the route. Roles are `allUsers` (member, executive,
super_admin) unless the row says **executives** (super_admin + executive) or **superAdmin**.

| Method & path | Query / body | Success `data` |
| --- | --- | --- |
| GET `/home` | – | `{ hero_events (upcoming with poster, 5, **featured first**), upcoming_events (5), latest_notices (5) }` |
| GET `/events` | `page, limit, search, category_id, from_date, to_date, upcoming`. Executive / Super Admin only: `mine=true` (own events, any status), `manage=true` (every status: the admin panel's Events tab), `status` (draft\|scheduled\|posted\|cancelled) | `{ events, pagination }`. Without `mine` / `status`: the posted events everyone sees. With them: the executive view (Super Admin: everyone's unless `mine`) |
| GET `/events/:id` | – | `{ event }`. The owner and the Super Admin get any status with the executive fields; others only a posted event (code 0 `rest_event_not_found`) |
| POST `/events` | **executives**. The whole event (see "Event body fields") + `action`: `draft` \| `post` \| `schedule` (+ future `publish_at`) | `{ event }`. No approval: `post` is live now, `schedule` at `publish_at`. The message tells which (draft saved / scheduled / posted) |
| PUT `/events/:id` | **executives** (owner or Super Admin). The same body as POST (full replace) | `{ event }` |
| DELETE `/events/:id` | **executives** (owner or Super Admin). Soft delete | – |
| PUT `/events/:id/status` | **superAdmin**. `status`: `posted` \| `draft` \| `cancelled` | `{ event }`. Posted = live now (announced); draft = hidden |
| PUT `/events/:id/featured` | **superAdmin**. `is_featured`: true \| false | `{ event }`. Featured events come first in the home slider (`events.is_featured`) |
| GET `/event-categories` | – | `{ categories: [{ id, code, name (translated), color }] }` |
| GET `/notices` | `page, limit, search, tag (one of App Settings' notice_tags, lowercase), from_date, to_date`. Executive / Super Admin only: `mine=true`, `manage=true` (every status), `status` (draft\|published) | `{ notices, pagination }`. Without `mine` / `status`: the notice board. With them: the executive view |
| GET `/notices/:id` | – | `{ notice }`. The owner and the Super Admin get any status with `recipient_ids`; others what the notice board shows them (code 0 `rest_notice_not_found`) |
| POST `/notices` | **executives**. `title, body, tag?, event_id?, audience? (all\|selected), recipient_ids (selected), action (draft\|publish), publish_at? (future = scheduled), email_members?` (Publish and Share, below). `tag` must be one of `notice_tags` (left out = the first), else `rest_notice_tag_invalid` | `{ notice }` |
| PUT `/notices/:id` | **executives** (owner or Super Admin). The same body as POST (full replace; the recipient list is replaced) | `{ notice }` |
| DELETE `/notices/:id` | **executives** (owner or Super Admin). Soft delete | – |
| PUT `/notices/:id/status` | **executives** + Notices permission (owner or Super Admin). `status`: `published` \| `draft` | `{ notice }`. Published = live now (announced) |
| GET `/media` | `page, limit, category_id, event_id, media_type (photo\|video), search (caption / uploader / category), from_date, to_date, status (pending\|approved\|rejected), manage=true` | `{ media, pagination }`. Without `status` / `manage`: approved all_members items plus my own pending/rejected ones. With them: the moderation view (extra fields below) + `counts: { all, photos, videos, pending, approved, rejected }` for the panel's tabs (one query). The Super Admin or an executive with the Media permission sees everyone's items (`status=pending` = the approval queue, `manage` = every status); others only their own |
| POST `/media` | `media_url, media_type (photo\|video), public_id, category_id, thumbnail_url?, file_size_bytes?, event_id?, caption?` | `{ media: { id, media_url, status } }` |
| GET `/media/:id` | – | `{ media }`. The Super Admin gets any item in any status with the moderation fields; others an approved item or their own (code 0 `rest_media_not_found`) |
| PUT `/media/:id` | own items only. At least one of `caption, category_id, event_id` (null unlinks) | `{ media }`. A member's edited item goes back to `pending` |
| DELETE `/media/:id` | own item, or the Super Admin. Soft delete (the Cloudinary file stays) | – |
| PUT `/media/:id/review` | **superAdmin**. `action`: `approve` \| `reject`, `reason` (required to reject). Works on any status (an approved item can be taken down) | `{ media }` |
| GET `/notifications` | `page, limit, type (event\|notice\|donation\|general)` | `{ notifications: [{ id, type, priority, title, body, ref_type (event\|notice\|media), ref_id, created_at, is_read, read_at }], unread_count, pagination }`. System titles (`notify_*` keys) are translated |
| PUT `/notifications/:id/read` | – (only the user's own copy) | – |
| PUT `/notifications/read-all` | – | – |
| GET `/notification-settings` | – | `{ settings: { events, notices, payments } }` (the app's Settings → Notifications; all on by default) |
| PUT `/notification-settings` | only the switches that change: `events, notices, payments` (booleans) | same as GET. A type switched off is no longer delivered to this user (`user_profiles.notify_*`, applied in `common.sendNotification`); `general` always is |
| GET `/members` | `page, limit, search (name / member code), role (super_admin\|executive\|member)` | `{ members: [{ id, name, member_code, role, photo_url, mobile, email }], pagination }`. Only completed, active members with `directory_visible`. `mobile` / `email` are null unless the member allows it (`mobile_visible` / `email_visible`), it's the viewer, or the viewer is in `CONTACT_VISIBLE_ROLES` |
| GET `/app-info` | – | `{ society_name, society_name_gu, show_gujarati_name, notice_tags, contact_email, phone, address, logo_url, social_links: [{ network (facebook\|instagram\|x\|youtube), url }] }`. Only filled links, in `SOCIAL_NETWORKS` order (App Settings → Social Networking); the app's side menu shows them |
| GET `/event-plans` | **executives** + Events permission. `page, limit, status (idea\|planning\|approved\|dropped\|converted), search` | `{ plans: [{ id, title, notes, tentative_date, status, created_by, created_by_name, created_at, can_edit (own or Super Admin) }], pagination }`. One shared board (`future_event_plans`), soonest date first |
| POST `/event-plans`, PUT `/event-plans/:id` | **executives** + Events permission (edit: owner or Super Admin). `title, notes?, tentative_date?, status` | `{ plan }` |
| DELETE `/event-plans/:id` | **executives** + Events permission (owner or Super Admin). Soft delete | – |
| GET `/donation-settings` | – | `{ upi: { payee_name, upi_id, qr_image_url, display_note } \| null, purposes, methods, min_amount, max_amount, executive_min_donation }`. `upi` is null until the admin adds a `upi_settings` row |
| GET `/donations` | `page, limit` | `{ donations: [{ id, amount, purpose, method, status, reference_no, proof_url, note, created_at, confirmed_at }], summary: { total, this_year }, pagination }`. Own donations; summary counts `success` only. A UPI one with `status = pending` and no `reference_no` is still unpaid (the app shows "Awaiting payment" + Finish Payment) |
| POST `/donations` | `amount, purpose (one of the settings' `donation_purposes`), method (upi_app\|upi_qr\|cash), reference_no?` (the 12-digit UTR: only older app builds send it here; dropped for cash) | `{ donation }`, status `pending`. **UPI without a UTR** = saved before paying (`rest_donation_started`), so its receipt number goes in the UPI note; the same amount + purpose again within 48 h returns the same unpaid donation. No admin alert until the UTR comes. Cash / with a UTR → `rest_donation_recorded` + admin alert |
| PUT `/donations/:id/payment` | `reference_no` (12-digit UTR), `method? (upi_app\|upi_qr)`, `proof_url?` (screenshot, Cloudinary `proofs/user_<id>/`) | `{ donation }`. Own unpaid UPI donation only (else `rest_donation_payment_already_sent` / `rest_donation_not_found`). Alerts the Super Admins. A UTR can be used once (`uq_donations_upi_reference`, code 0 `rest_donation_reference_used`) |
| GET `/executive-request` | – | `{ application \| null, executive_min_donation }`: the latest request (`status, donation_amount, reference_no, reason, payment_proof_url, review_note, …`) |
| POST `/executive-request` | **members only** (route). `donation_amount (>= the settings' `executive_min_donation`), reference_no, reason, payment_proof_url?` (Cloudinary `proofs/user_<id>/`) | `{ application }`. One pending request at a time (`rest_executive_request_pending`); linked to the member's donation with the same `reference_no` |

Executive view (`executiveView: true` in `userModule.listEvents / listNotices / listMedia`) adds these fields:
- **events** (`mine` / `status`, or the owner's / Super Admin's detail): `status, publish_at, posted_at, approved_by (who posted it), approved_at, email_members, created_by, created_by_name, created_at, updated_at`.
- **notices** (same): `status, audience, published_at, email_members, recipient_count, created_by, created_by_name, created_at, updated_at` (detail: `recipient_ids`).
- **media** (`status` sent, or the Super Admin's detail): `privacy, cloudinary_public_id, file_size_bytes, moderated_by, moderated_at, uploaded_by`.

Item shapes:
- **event**: `{ id, title, description, event_date, end_date, start_time, end_time, venue_name, venue_address, map_link, poster_url, event_status (upcoming|ongoing|completed), category: { id, code, name, color } }`.
  Ordering: upcoming/ongoing first (soonest first), then finished (newest first).
- **notice**: `{ id, title, body, tag, event_id, published_at }`. A `selected`-audience notice is only shown to its
  recipients and its creator.
- **event** also has `organizer_name`, `contact_number`, `latitude`, `longitude` (numbers or null) and `images` (array of links, in order; the first is the cover when no poster was sent).
- **media**: `{ id, media_type, media_url, thumbnail_url, caption, status, rejection_reason, event_id, created_at, uploaded_by_name, is_mine (0/1), category: { id, name, color } }`

Notifications (in-app; FCM push comes later):
- **Always send through the one common function** (never insert into `notifications` yourself):
  ```js
  common.sendNotification({
      sender_id: request.loginUser.id,          // null for the system / cron
      receiver_ids: [user_id],                  // or constant.NOTIFY_EVERYONE (every active member who finished sign-up)
      type: constant.NOTIFICATION_TYPE.EVENT,   // event | notice | donation | general
      title: "notify_media_approved",           // text, or a notify_* language key (translated when read)
      message: event.title,                     // the body
      ref_type: "event", ref_id: event.id,      // optional: what the app opens on tap
      // priority: constant.NOTIFICATION_PRIORITY.HIGH (optional, default normal)
  });
  ```
  It writes one `notifications` row and one `notification_recipients` row per receiver (own read state each), and
  never throws. FCM push will be added inside it, so every caller gets push automatically.
- Called from: event review (→ creator), gallery review (→ uploader), role change and executive request rejection
  (→ that member), and `notifyNewContent()` (new event → everyone, new notice → everyone or its selected recipients).
- New events and notices: `common.notifyNewContent()` announces every posted event and published notice whose
  `notified_at` is NULL, and sets `notified_at` in the same UPDATE (never twice). It runs right after an executive saves
  (so items posted / published now are announced at once) and in the daily cron job (scheduled ones). A `selected` notice notifies only its recipients.
- **Clean-up** (`cron.deleteOldReadNotifications`, daily at 1 AM and on start): a user's copy
  (`notification_recipients`) is deleted `NOTIFICATION_READ_KEEP_DAYS` (30) days after they read it (`read_at`), then
  every notification older than that with no copy left. Unread copies are never deleted.
- **Notification switches**: `sendNotification` leaves out receivers who switched that type off
  (`constant.NOTIFICATION_PREF_COLUMNS`: event → `notify_events`, notice → `notify_notices`, donation → `notify_payments`).
- **Publish and Share (email)**: `email_members: true` on POST / PUT `/user/events` and `/user/notices` (the panel's
  "Share by email" switch, the app's checkbox) is saved in `events.email_members` / `notices.email_members`. When
  `notifyNewContent` announces the item it also calls `common.emailMembers()`: one HTML mail (`createContentMailTemplate`
  in `mail.js`, typed text escaped) to every active member (a `selected` notice: its recipients), in Bcc groups of
  `MAIL_BATCH_SIZE` (50) through `sendOtpMail({ bccEmails })`. It is sent once, when the item first goes live (a
  scheduled one at the cron run), and skipped when the server has no `MAIL_FROM` / `SMTP_USER`. Brevo's free plan sends
  300 mails a day and Gmail about 500, so a large society needs a paid mail plan.
- Reviews: approving or rejecting a photo tells its uploader (`notify_media_*`, the reason in `message`). The old
  `notify_event_approved / _rejected` keys stay only for rows saved before
  events stopped needing approval (2026-11-19).
- System titles are language keys stored in `notifications.title` and translated when read (rule 3). Content
  notifications use the event or notice title as it is.

### Executive – `/executive` (`executiveRoute.js` → `executiveModule.js`): member management, superAdmin only

Events, notices and gallery are **not** here any more (all under `/user`, above).

| Method & path | Roles (route) | Body / query | Success `data` |
| --- | --- | --- | --- |
| PUT `/members/:id/role` | superAdmin | `role`: `member` \| `executive` | `{ user }`. The user is notified (`notify_role_*`) and logged out of every device (they log in again with the new role). A Super Admin's role can't be changed (`rest_role_change_not_allowed`) |
| GET `/executive-requests` | superAdmin | `page, limit, status` (pending = the queue), `search` (name / mobile / email) | `{ counts: { pending, approved, rejected, suspended } (with the search, without the status), requests: [{ id, status, donation_amount, reference_no, reason, payment_proof_url, review_note, donation_id, donation_status, user_id, full_name, email, mobile, role, created_at, reviewed_at }], pagination }` |
| PUT `/executive-requests/:id/review` | superAdmin | `action`: `approve` \| `reject`, `reason` (required to reject, shown to the member) | – . Approve makes the member an executive (same transaction). Only pending requests (`rest_executive_request_not_pending`). The member is notified |

### Admin panel – `/admin` (`adminRoute.js` → `adminModule.js`)

The panel logs in here, then uses the same token on every shared API (`/user/events`, `/user/notices`,
`/user/media?status=pending`, `/executive/…`). Logout is the shared `DELETE /auth/logout`.

| Method & path | Roles (route) | Body / query | Success `data` |
| --- | --- | --- | --- |
| POST `/login` | Public | `email, password`, device fields (e.g. `uuid`, `device_type: "web"`) | `{ userData, token }`. Wrong email / password → code 0 `rest_invalid_login_credentials`; any role but `super_admin` → code 0 `rest_admin_only`; inactive → `rest_account_inactive` |
| GET `/dashboard` | superAdmin | `from_date?, to_date?` (yyyy-mm-dd, the panel's date picker) | `{ counts: { total_members, executives, active_events, total_notices }, money: { total_donations, total_expenses, balance, donation_trend, expense_trend }, pending: { donations, expenses, executive_requests, media, total }, monthly: [{ month: "YYYY-MM", donations, expenses }], recent_activities: [{ id, action, text (translated), target, actor_name, record_id, created_at }] (newest `ACTIVITY_DASHBOARD_LIMIT` 6, see Recent Activities below) }` |
| GET `/backup` | superAdmin | – | `{ file_name, tables, sql }`: every row of every table as SQL (`INSERT … json_populate_record`, parents first, then the id sequences and `member_code_seq`); the panel saves it as a `.sql` file (App Settings → Backup & Data). Sets `last_backup_at`. Restore: an empty database + `schema.sql` (not seed.sql), then `psql -f` the file |

| GET `/members` | superAdmin | `page, limit, search (name / mobile / email / member code), role (member\|executive), status (active\|suspended), signup (completed\|pending), from_date, to_date (join date), sort (name\|joined\|member_code), order (asc\|desc)` | `{ members: [{ id, member_code, name, email, country_code, mobile, role, status, signup, is_verified, address, photo_url, joined_on, last_login_at }], pagination }`. Every member / executive that isn't deleted, any status / sign-up step. **The Super Admin is not listed** (nor counted in the dashboard's `total_members`) |
| GET `/members/:id` | superAdmin | – | `{ member, donations: { confirmed_count, confirmed_total, recent (5) } }` |
| POST `/members` | superAdmin | `username, email, country_code? (+91), mobile_number, password, address?, member_code? (empty = the next GM code), role? (member\|executive)` | `{ member }`. Added by hand for people who don't sign up in the app: sign-up `completed`, email counted as verified, an executive gets `DEFAULT_EXECUTIVE_SECTIONS`. They log in with that email / mobile and password. Taken email / mobile / code → the same errors as PUT |
| PUT `/members/:id` | superAdmin | only what changes: `username, email, country_code + mobile_number (together), address, member_code` | `{ member }`. Taken email / mobile / member code → code 0 (`rest_email_already_exists`, `rest_mobile_used_by_other`, `rest_member_code_already_exists`) |
| PUT `/members/:id/status` | superAdmin | `status`: `active` \| `suspended` | `{ member }`. Suspended = deactivated: tokenMiddleware refuses them on the next request (HTTP 401) |
| DELETE `/members/:id` | superAdmin | – | – . Soft delete + every device logged out. Their donations stay. The email / mobile stay taken |
| GET `/executives` | superAdmin | `page, limit, search, sort, order` | `{ executives: [ <member> + permissions: { sections } ], pagination }` (the members list with `role=executive` and `status=active`, + one query for their permissions). A deactivated executive is hidden until reactivated; their permissions are kept |
| PUT `/executives/:id/permissions` | superAdmin | `sections` ([events, notices, …], replaces the old set) | `{ permissions }`. Applies on the executive's next request. Making / removing an executive: the role API |

Member rules: a Super Admin can't be edited, deactivated or deleted through these APIs (`rest_super_admin_protected`).
A deactivated (`suspended`) member is refused on every request (tokenMiddleware), and the panel can't change their
permissions, make them an executive or approve their Executive Request (code 0 `rest_member_inactive`); taking the
executive role away and rejecting a request still work.
The role still changes through `PUT /executive/members/:id/role` (it notifies the member). `users.last_login_at` is
set on every login (`generateToken`).

Dashboard rules:
- **Members**: active users who finished sign-up (`executives` = those with the executive role).
- **Active events**: posted events that haven't ended. **Notices**: published notices.
- **Donations**: confirmed (`success`), counted on `confirmed_at` (or `created_at`). **Expenses**: `society_transactions`
  rows with `entry_type = 'paid'`. **Balance** = donations − expenses in the picked range (all time without one).
- **Trend**: % change against the previous period of the same length; `null` without both dates or when that period was 0.
- **Monthly** (the chart): one row per month of the picked period and only those months (a year → 12). A period of
  up to `DAILY_CHART_MAX_DAYS` (31, e.g. one month) comes back **per day** instead (`month` = `'YYYY-MM-DD'`); the
  panel's chart shows day bars then. Same for `GET /admin/finance`. Without `from_date` it starts at the first confirmed donation / expense; without `to_date` it runs to
  this month. Each month only counts the days inside the period, so the chart always adds up to the cards.
- **Super Admin**: `superadmin@gaamtoda.com` exists in the live database. Another one: sign up in the app, then
  `UPDATE users SET role_id = 1 WHERE email = '…';` on Neon.
  (the API can never make anyone `super_admin`).
- **Recent Activities** (dashboard only; there is **no audit log**, no activity table and no `/admin/activities` API
  since 2026-11-25): `recentActivities()` in `adminModule.js` reads the newest rows of `events`, `notices`, `users`
  (completed sign-ups), `media_items`, `executive_applications`, `donations` and `society_transactions` (expenses) in
  one UNION query, newest first. `action` is a `constant.ACTIVITY` code, `text` the language key `activity_<code>`.
  Don't add a log table or log calls back; to show a new kind of item, add a branch to that query, a code to
  `ACTIVITY` and `activity_<code>` to the 3 language files. Executives see their own recent events in the app
  (Executive Dashboard → Recent Activity, `GET /user/events?mine=true`).

### Admin panel – money and settings (`adminRoute.js` → `adminModule.js`)

Routes: the Super Admin, or an executive with that permission section (`requirePermission('donations' | 'expenses' |
'reports' | 'settings')`). Every list is paged and returns a `summary` of the same filters for the cards.

| Method & path | Body / query | Success `data` |
| --- | --- | --- |
| GET `/donations` | `page, limit, search (donor / member code / reference / receipt no DON001), status (success\|pending\|rejected), mode (upi\|cash\|bank\|cheque), purpose, donor_user_id (one member: Member detail → Payment History export), from_date, to_date (donated_on), sort (date\|amount), order` | `{ donations: [{ id, donor_user_id, donor_name, member_code, amount, purpose, method, status, reference_no, donated_on, proof_url, note, created_at, confirmed_at, entered_by_name, verified_by_name }], summary: { count, verified_total, highest, average }, pagination }` |
| GET `/donations/:id` | – | `{ donation }` |
| POST `/donations`, PUT `/donations/:id` | `donor_user_id` **or** `member_code` (as typed in the app; unknown → `rest_donor_not_found`) **or** `donor_name`, `amount, purpose, method (upi_app\|upi_qr\|cash\|bank\|cheque), reference_no?, donated_on (not future), status (default success), proof_url? (Cloudinary finance/), note?` | `{ donation }`. A UTR can be used once |
| PUT `/donations/:id/status` | `status`: success (verified) \| pending \| rejected | `{ donation }`. A member donor gets `notify_donation_verified / _rejected` |
| DELETE `/donations/:id` | – | soft delete |
| GET `/expenses` | `page, limit, search (description / paid to / reference / expense no EXP001), status (verified\|pending\|rejected), mode, category, from_date, to_date, sort, order` | `{ expenses: [{ id, description, paid_to, category, amount, mode, reference_no, txn_date, status, bill_url, … }], summary: { count, verified_total, highest, average, categories: [{ category, amount }] (verified, largest first), income (verified donations in the same dates), balance (all-time verified donations − expenses) }, pagination, expense_categories (App Settings list, for the app's form) }` |
| GET `/expenses/:id`, POST `/expenses`, PUT `/expenses/:id`, PUT `/expenses/:id/status`, DELETE `/expenses/:id` | `description, paid_to, category, amount, mode (cash\|upi\|bank\|cheque), reference_no?, txn_date, status (default pending), bill_url?` | `{ expense }` |
| GET `/finance` | `from_date?, to_date?` | `{ totals: { donations, expenses, balance, transactions, donation_trend, expense_trend }, monthly, recent (5 transactions) }` (the Financial Overview) |
| GET `/reports/data/:type` | `summary\|donation\|expense\|category\|monthly\|custom` + `from_date, to_date, category, mode, page, limit` | `{ rows, pagination }`. Lists are paged; summary / category / monthly are totals added up by the database |
| GET `/reports`, POST `/reports`, DELETE `/reports/:id` | POST: `report_type, from_date?, to_date?, category?, mode?` | the "Generated Reports" history (`generated_reports`). The panel builds the file in the browser |
| GET `/settings` | – | `{ settings: { society_name, society_name_gu, contact_email, phone, address, logo_url, show_gujarati_name, executive_min_donation, allow_registration, allow_uploads, require_media_approval, event_notifications, notify_new_member, notify_donation, notify_executive_request, notify_media_upload, notify_expense, donation_purposes, expense_categories, notice_tags (lowercase), social_links: { facebook, instagram, x, youtube }, last_backup_at }, event_categories, upi }` |
| PUT `/settings` | only what changes (not `last_backup_at`); `social_links` (https links, "" = hidden); `event_categories: [{ id?, name }]` (the full list: no id = add, left out = hidden), `upi: { payee_name, upi_id, qr_image_url?, display_note? } \| null` | same as GET |

Money rules:
- **Only verified entries count** in totals, the dashboard, the overview and reports: donations with `status =
  'success'` (on `donated_on`), expenses with `status = 'verified'`. Pending ones are counted as pending.
- A member's donation from the app starts `pending`; the panel verifies or rejects it (the member is notified).
- **UPI donations (manual verification)**: on the Donate screen the app first saves the donation (`POST /user/donations`,
  pending, no UTR), then builds the UPI link and QR itself:
  `upi://pay?pa=<upi_id>&pn=<payee_name>&am=501.00&cu=INR&tn=Donation%20DON042` (`services/upi.ts`). `pa` / `pn` come
  from App Settings → UPI in the panel (`upi_settings`, `GET /user/donation-settings`); `tn` is the receipt number
  (`DON` + id), which shows on the bank statement. After paying, the donor sends the UTR and an optional screenshot
  (`PUT /user/donations/:id/payment`). The treasurer matches amount + UTR with the bank statement and verifies it in
  the panel; the donor is notified and the receipt appears in My Donations. Until the UTR comes, the dashboard's pending
  count and Recent Activities leave the donation out (`UNPAID_DONATION_SQL` in adminModule) and the panel shows it as
  "Awaiting UTR" (`isAwaitingUtr`).
- Payment modes: the panel filters by `upi | cash | bank | cheque`; a donation's UPI covers `upi_app` and `upi_qr`
  (`DONATION_METHODS_BY_MODE`).

**App settings** (`common.getSettings()`: every key of `constant.DEFAULT_SETTINGS`, overridden by `app_settings`
rows (JSON values); cached in memory, `common.saveSettings()` clears it). They are applied, not only stored:
- `allow_registration` → sign-up refused (`rest_registration_closed`); `allow_uploads` → gallery uploads refused;
  `require_media_approval` off → members' uploads go live at once;
- `executive_min_donation` → the Executive Request minimum; `donation_purposes` → what members can choose
  (`GET /user/donation-settings` returns both, plus the UPI details);
- `event_notifications` off → no "new event" notifications;
- `notify_*` → in-app alerts to every Super Admin (`common.notifyAdmins`) for a new member, a member's donation, an
  executive request, a member's upload waiting for approval, and an executive's donation entry (`notify_donation`) or
  expense (`notify_expense`) saved as pending (the Super Admin's own entries don't alert);
- `notice_tags` → the notice categories (`notices.tag`, lowercase; the CHECK was dropped on 2026-11-23). important /
  general / event are translated in the app; the society's own show as typed (Title Case). Removing one leaves old
  notices as they are;
- `society_name` / `society_name_gu` → the panel header and PDFs (`lib/exporters.ts` `setSocietyName`), the app's
  header, splash, menu, receipts, reports and share text (`GET /user/app-info`).
- With several backend servers, the cache would only clear on the one that saved (one server today).

Event body fields:
- **Required**: `category_id, title, event_date (yyyy-mm-dd), start_time (HH:mm), venue_name, action`.
- **Optional**: `email_members (Publish and Share), description, end_date (>= event_date), end_time, venue_address, map_link, organizer_name, contact_number, poster_url, images (max `EVENT_MAX_IMAGES` links, replaces the list on edit), latitude + longitude (both or neither), plan_id (create only: the Event Planning plan it comes from, own or any for the Super Admin; the plan becomes `converted` with `converted_event_id`, in the same transaction)`. The poster and the images must be in the `events/` Cloudinary folder. The event and its images are saved in one transaction.

Event status flow:
- `draft`: saved, not shown to members.
- `post` / `schedule` by anyone allowed to create events (Super Admin, or an executive with the Events section) →
  `posted` / `scheduled` straight away; there is no approval step (the daily cron job, at midnight, posts a scheduled
  event once `publish_at` has passed).
- The Super Admin can still move an event to draft, post it now or cancel it (`PUT /events/:id/status`).
- Members only ever see `posted`.

Notice flow:
- `draft` is hidden.
- `publish` makes it live, or live at `publish_at` (hidden until then).
- The `selected` audience is saved in a transaction with `notice_recipients`. Ids that aren't active users are skipped,
  and if none are valid the request fails with `rest_notice_recipients_invalid`.
- There is no approval step for notices.

## Not built yet (planned)

- Push notifications (FCM; tables exist). SMS / WhatsApp API alerts. There is **no payment gateway**: the app takes
  UPI (UPI app / QR code) and cash only; card and net banking were removed from the app on 2026-11-26 (the `payments`
  table and the `gateway` method value stay unused).
- RFP items not started: Ads Campaign panel, admin theme panel, admin 2FA, family members (5A).
- Settings the client asked about (executive minimum donation, society name) are now in App Settings; `cash_entry_mode` in `app_settings` is still an open question.

## Frontends (short)

- **Mobile** (`frontend/mobile/src`):
  - `api/client.ts` sends `api-key`, `Accept-Language` and `Authorization`, and throws `ApiError` unless the code is 1 or 5. Code -1 → session expired.
  - API calls are in `api/auth.ts`, `api/user.ts`, `api/member.ts`, `api/media.ts` and `api/executive.ts` (executive
    screens: events they create, notices, Event Planning, donation entries, finance and reports).
  - The app's own UI text is in `i18n/strings.ts`; screens are in `screens/`; `config/index.ts` reads `EXPO_PUBLIC_*`.
- **No dummy data.** Every member and executive screen reads from the backend (there is no `data/` folder). Executive screens:
  - **Society Expenses** (`GET /admin/expenses`, Expenses permission): period picker (this month by default), income /
    expenses / balance cards and the category breakdown from `summary`, then the period's expenses with Load More.
    "+ Add" opens **Add Expense** (`POST` / `PUT /admin/expenses`, bill to Cloudinary `finance/`, Submit = pending or
    Save & Verify); tapping an expense offers Edit / Verify / Reject / Delete.
  - **My Notices** (`GET /user/notices?mine=true`): Drafts / Published chips, Edit (Post Notice with `noticeId`, `PUT`),
    Publish / Unpublish (`PUT /status`), Delete.
  - **Media Approval** (Media permission): Pending / Approved / Rejected tabs (`GET /user/media?status=`), Approve, Reject
    or Take Down with a reason (`PUT /user/media/:id/review`).
  - **Event Planning → Create Event**: the plan's title / date / notes fill Create Event (`EventDraft.planId`); saving
    sends `plan_id` and the plan shows "Event Created".
  - **Create Event → Event Preview** (`services/eventSubmit.ts`): the banner is uploaded to Cloudinary `events/`, then
    `POST` / `PUT /user/events` with `draft` / `post` / `schedule`; the server's message says posted or scheduled.
    **My Events** (`GET /user/events?mine=true`): status chips, View / Edit / Duplicate / Delete.
  - **Post Notice** (`POST /user/notices`, optionally about an upcoming event) and **Event Planning** (`/user/event-plans`).
  - **Donation Entries / Add Donation** (`/admin/donations`, Donations permission): member code or donor name, proof
    to Cloudinary `finance/`, Submit (pending) or Save & Verify.
  - **Financial Reports** (`GET /admin/finance`, chart per day for a month) and **Export Reports**: the PDF / Excel is
    built on the phone (`services/reportExport.ts → makeReport`): Donation Summary / Transaction History / Member-wise
    from `GET /admin/reports/data/donation`, Expense Report from `…/data/expense`, Income & Expense Summary from
    `…/data/summary` + `category` + `monthly`. Each is recorded in `POST /admin/reports`; Recent Reports rebuild the file
    when opened.
  - **Publish and Share (email)**: Event Preview and Post Notice have an "Also share by email" checkbox
    (`email_members`); the primary button then reads Post & Share / Publish & Share.
- **Sharing**: events and notices go to WhatsApp with the venue and a Google Maps link (`services/share.ts`, `wa.me`);
  a verified donation's receipt PDF and the My Donations summary (PDF / Excel) open the share sheet
  (`services/receipt.ts`, expo-print + expo-sharing).
- **Uploads** go straight to Cloudinary (`services/media.ts`):
  - photos are shrunk to `MEDIA.maxImageSide` (1600px) and re-saved as JPEG at `MEDIA.imageQuality` (0.7);
  - iOS videos are re-encoded to 720p (`videoExportPreset`); Android has no built-in video compression, so videos
    there are only size-checked (100MB). Real Android compression needs a development build with a native library;
  - PDFs (payment proof) are sent as they are.
- **Admin** (`frontend/admin/src`): Next.js app router `app/(admin)/<screen>`, TanStack Query and Tailwind.
  - **Connected to the backend**: login (`POST /admin/login`, token in `lib/session.ts`, logout calls `DELETE /auth/logout`)
    , Members (list, detail, **Add Member** `components/forms/AddMemberForm.tsx`, edit, deactivate, delete, Make Executive / Make Member in the row's ⋮ menu
    via `PUT /executive/members/:id/role`), **Events & Notices** (`components/EventsNotices.tsx`: list with
    `manage=true`, create / edit / delete, post / draft / cancel, featured, a "Share by email" switch (Publish & Share),
    notice categories from App Settings (`noticeTagLabel`); posters upload straight
    to Cloudinary `events/<yyyy>/<mm>` via `services/cloudinary.ts`, env `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`,
    `_UPLOAD_PRESET`, `_ENV_FOLDER`), **Executives** (requests with counts + review; executives with permission
    switches, add / remove executive), **Media Approval** (`app/(admin)/media`: tabs All / Photos / Videos / Pending / Approved /
    Rejected with counts, search, dates, approve / reject / delete), the **Dashboard** (`GET /admin/dashboard`, Recent Activities included) and **My Profile** (`/profile`: name, address, email with OTP,
    via `/auth/profile`, `/auth/edit-profile`, `/auth/verify-email-change`) + **Change Password** dialog
    (`/auth/change-password`, top bar menu and Profile). Logout: `hooks/useLogout.ts`. `.env.local`: `NEXT_PUBLIC_BACKEND_URL`,
    `NEXT_PUBLIC_BACKEND_API_KEY` (= the backend's `API_KEY`). File uploads (`FileUpload` / `useUpload`) must be given
    an uploader (`uploadToCloudinary` and friends); there is no default.
  - **Connecting a screen** (follow Members): calls in `services/<screen>.ts` with `api()` from `services/core/backend.ts`
    (adds api-key + token, returns `{ data, message }`, throws the backend's message, 401 → login page); hooks in
    `hooks/use<Screen>.ts` built on `hooks/useBackend.ts`:
    - `useBackendList(key, query, load)`: one page per query, cached `LIST_CACHE_MS` (5 min). Going back to a page
      already seen makes **no API call**;
    - `useBackendAction(keys, run)`: after a change, marks the screen's cache old (only the page on screen reloads)
      and shows the backend's message as a toast.
  - **Exports**: `exportTable(table, fileName, 'excel' | 'pdf')` in `lib/exporters.ts` (PDF via `jspdf-autotable`:
    maroon header, filters line, repeated column header, page numbers). `ExportButton` is the "Export ▾ Excel / PDF"
    menu on every screen. Rows: the picked rows, or `fetchAllPages()` over the screen's list API.
  - Backend timestamps are UTC: pass them through `fromUtc()` before `formatDate` / `formatDateTime`.
  - **Loaders** (nothing to add per screen): `components/LoadingBar.tsx` (gold bar under the top bar whenever any
    query or save is running, after 150 ms); `DataTable` shows skeleton rows on the first load and dims the rows under a
    "Loading…" badge when given `isFetching` (pass `list.isFetching`); detail pages use a skeleton shaped like the page
    (see `MemberDetailsSkeleton`); action buttons show a spinner while their mutation `isPending`.
  - **Opening a page** reacts at once: `lib/navigation.ts` + AdminShell catch every link click (capture phase) and
    show the page skeleton, the loading bar and the clicked menu item with a spinner until the new page is on screen.
    Buttons that open a page use `useNavigate()` instead of `router.push`. `app/(admin)/loading.tsx` is the same
    skeleton for Next.js. (`next dev` compiles a page on its first visit, 3–8 s; a production build opens it in ~0.2 s.)
  - **Backend down / slow**: `api()` gives up after `BACKEND_TIMEOUT_MS` (20 s) and throws a clear message; tables
    and detail pages show it with Retry (`DataTable errorMessage`).
  - Dashboard, Financial Reports **and every list with dates** (FilterBar `dateRange`) use `components/PeriodFilter.tsx`
    (All time / Year / Month with ‹ › to step months / Custom → `from`, `to`, `period` in the URL) and
    `components/IncomeExpenseChart.tsx` (only the period's months, or days for a month; many scroll sideways, opening
    on the newest, with the ₹ axis fixed).
  - Dashboard cards open their screen with the matching filters (`StatCard href`); Pending Approvals opens a
    breakdown linking to each approval queue. Receipts: `exportDonationReceipt` / `exportExpenseVoucher` (lib/exporters).

## Testing

```bash
curl -s -H "api-key: <API_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"x@example.com","password":"secret1"}' http://localhost:5020/api/v1/auth/login
```

- The database is the LIVE one: for a full run, sign up a throwaway `@example.com` user with OTP `123456`, call the
  endpoints, then delete the user and everything it created (`DELETE FROM users WHERE email = ...`; its `media_items`
  first) and reset the id sequences. Never load demo or growth data into it.
- psql: `"C:\Program Files\PostgreSQL\18\bin\psql.exe" "<DATABASE_URL from backend/.env>"`.
- A test script saved in `backend/` makes `npm run dev` (nodemon) restart the server. Run throwaway scripts from
  `backend/node_modules/` (nodemon ignores it, and `pg` still resolves), or test against a second server:
  `PORT=5021 SMTP_USER= BREVO_API_KEY= MAIL_FROM= node server.js` (mail off).
- Mobile changes: `npx tsc --noEmit` in `frontend/mobile`.
- Mobile map: `react-native-maps` (in Expo Go) in `components/events/EventMapCard.tsx`, a static preview; tapping it opens Google Maps (`googleMapsUrl`). It isn't in `components/index.ts` (native module). A production Android build needs a Google Maps key: the `react-native-maps` config plugin with `androidGoogleMapsApiKey` in `app.json`. Until it has one, a built Android app (APK) shows only the "Open in Google Maps" button (`CAN_SHOW_MAP`: map only in Expo Go or on iOS); after adding the key, drop that check.
