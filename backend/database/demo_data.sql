-- Demo data so the admin panel and the app have something to show (LOCAL / development only, never production).
--   psql -U postgres -h localhost -d society_app -f database/demo_data_remove.sql   (first: removes old demo rows)
--   psql -U postgres -h localhost -d society_app -f database/demo_data.sql
-- Dates are relative to today, so the data stays current when run again.
-- Demo accounts: demo.1@example.com … demo.28@example.com, password Demo@12345 (demo.1–3 are executives).
-- Images are Cloudinary's public demo pictures (res.cloudinary.com/demo/…): fine to view; to edit a demo event in the
-- panel, upload a new poster (the backend only accepts posters from the society's own events/ folder).
-- Demo rows are marked so demo_data_remove.sql can take them out: see the notes there.

BEGIN;

-- ---------- Who records things: the Super Admin (or, if there is none, the first demo executive) ----------
DROP TABLE IF EXISTS demo_admin;
CREATE TEMP TABLE demo_admin AS
  SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
  WHERE r.code = 'super_admin' AND u.is_deleted = 0 ORDER BY u.id LIMIT 1;

-- ---------- People: 3 executives, 25 members (one deactivated, one who hasn't finished sign-up) ----------
DROP TABLE IF EXISTS demo_people;
CREATE TEMP TABLE demo_people (n INT, name TEXT, role TEXT, area TEXT);
INSERT INTO demo_people VALUES
  (1, 'Ramesh Patel', 'executive', 'Nava Vadaj'), (2, 'Hetal Shah', 'executive', 'Maninagar'), (3, 'Dhaval Desai', 'executive', 'Naranpura'),
  (4, 'Kiran Mehta', 'member', 'Vastrapur'), (5, 'Priya Joshi', 'member', 'Satellite'), (6, 'Nilesh Parmar', 'member', 'Paldi'),
  (7, 'Bhavna Trivedi', 'member', 'Ghatlodia'), (8, 'Jignesh Chauhan', 'member', 'Sabarmati'), (9, 'Komal Pandya', 'member', 'Bopal'),
  (10, 'Mahesh Solanki', 'member', 'Chandkheda'), (11, 'Rekha Bhatt', 'member', 'Navrangpura'), (12, 'Sanjay Rathod', 'member', 'Isanpur'),
  (13, 'Pooja Thakkar', 'member', 'Thaltej'), (14, 'Vipul Prajapati', 'member', 'Nikol'), (15, 'Asha Vyas', 'member', 'Gota'),
  (16, 'Hitesh Rana', 'member', 'Odhav'), (17, 'Neha Dave', 'member', 'Bodakdev'), (18, 'Ketan Modi', 'member', 'Ranip'),
  (19, 'Falguni Soni', 'member', 'Memnagar'), (20, 'Rajesh Gohil', 'member', 'Vejalpur'), (21, 'Meena Panchal', 'member', 'Sola'),
  (22, 'Chirag Barot', 'member', 'Juhapura'), (23, 'Divya Jani', 'member', 'Khokhra'), (24, 'Paresh Makwana', 'member', 'Vatva'),
  (25, 'Shital Raval', 'member', 'Shahibaug'), (26, 'Amit Kotak', 'member', 'Ambawadi'), (27, 'Krupa Upadhyay', 'member', 'Prahladnagar'),
  (28, 'Yogesh Bhavsar', 'member', 'Kalupur');

INSERT INTO users (full_name, email, country_code, mobile, password_hash, signup_step, email_verified_at, role_id, status,
                   preferred_language, created_at, last_login_at)
SELECT CASE WHEN n = 28 THEN '' ELSE name END,
       'demo.' || n || '@example.com', '+91', '98250' || LPAD(n::text, 5, '0'),
       '$2b$10$Dxy2f5l3/LHl3J9k0cTVGeUpfrYz565uQlPktu0I6Yq1xHiA42tOm', -- Demo@12345
       CASE WHEN n = 28 THEN 'profile_pending' ELSE 'completed' END,
       NOW(), (SELECT id FROM roles WHERE code = role),
       CASE WHEN n = 27 THEN 'suspended' ELSE 'active' END,
       (ARRAY['en', 'gu', 'hi'])[1 + n % 3],
       NOW() - ((400 - n * 13) || ' days')::interval,
       CASE WHEN n % 4 = 0 THEN NULL ELSE NOW() - ((n % 9) || ' days')::interval END
FROM demo_people ORDER BY n;

DROP TABLE IF EXISTS demo_users;
CREATE TEMP TABLE demo_users AS
  SELECT u.id, p.n, p.name, p.role, p.area FROM users u JOIN demo_people p ON u.email = 'demo.' || p.n || '@example.com';

-- Member codes in sign-up order (the 28th hasn't finished sign-up, so has none yet)
UPDATE users u SET member_code = 'GM' || LPAD(nextval('member_code_seq')::text, 4, '0')
FROM (SELECT id FROM demo_users WHERE n <> 28 ORDER BY n) d WHERE u.id = d.id;

INSERT INTO user_profiles (user_id, address_line1, city, state, pincode, photo_url, directory_visible, mobile_visible, email_visible)
SELECT id, (10 + n) || ', Shree Ganesh Society, ' || area, 'Ahmedabad', 'Gujarat', '3800' || LPAD((n % 90 + 10)::text, 2, '0'),
       CASE n WHEN 2 THEN 'https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_thumb,g_face/woman.jpg'
              WHEN 5 THEN 'https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_thumb,g_face/lady.jpg'
              ELSE NULL END,
       1, CASE WHEN n % 3 = 0 THEN 1 ELSE 0 END, CASE WHEN n % 5 = 0 THEN 1 ELSE 0 END
FROM demo_users WHERE n <> 28;

-- Executive permissions: Events + Notices for all three; Media for Hetal; Donations + Reports for Dhaval
INSERT INTO executive_permissions (user_id, module_id, can_view, can_create, can_edit, can_approve, granted_by)
SELECT d.id, m.id, 1, 1, 1, CASE WHEN d.n = 1 AND m.code = 'events' THEN 1 ELSE 0 END, (SELECT id FROM demo_admin)
FROM demo_users d JOIN modules m
  ON m.code IN ('events', 'notices')
  OR (d.n = 2 AND m.code = 'media')
  OR (d.n = 3 AND m.code IN ('donations', 'reports'))
WHERE d.role = 'executive';

-- ---------- Events (made by Ramesh, an executive) ----------
DROP TABLE IF EXISTS demo_creator;
CREATE TEMP TABLE demo_creator AS SELECT id FROM demo_users WHERE n = 1;

INSERT INTO events (category_id, title, description, event_date, end_date, start_time, end_time, venue_name, venue_address,
                    organizer_name, contact_number, poster_url, status, publish_at, posted_at, approved_by, approved_at,
                    is_featured, created_by, notified_at, created_at)
SELECT (SELECT id FROM event_categories WHERE code = e.cat), e.title, e.descr, CURRENT_DATE + e.day_offset,
       CASE WHEN e.days > 1 THEN CURRENT_DATE + e.day_offset + e.days - 1 END, e.start_t, e.end_t, e.venue, 'Shree Ganesh Society, Ahmedabad',
       'Executive Committee', '+91 98250 00001',
       'https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/' || e.img,
       e.status,
       CASE WHEN e.status = 'scheduled' THEN NOW() + INTERVAL '14 days' END,
       CASE WHEN e.status = 'posted' THEN NOW() - ((e.day_offset * -1 + 20) || ' days')::interval END,
       CASE WHEN e.status IN ('posted', 'scheduled') THEN (SELECT id FROM demo_admin) END,
       CASE WHEN e.status IN ('posted', 'scheduled') THEN NOW() - INTERVAL '10 days' END,
       e.featured, (SELECT id FROM demo_creator), NOW(), NOW() - INTERVAL '30 days'
FROM (VALUES
  ('cultural', 'Navratri Raas Garba Mahotsav', 'Nine nights of garba and dandiya with live orchestra. Traditional dress encouraged.', -40, 9, TIME '20:00', TIME '23:30', 'Society Ground', 'couple.jpg', 'posted', NULL, 0),
  ('festival', 'Ganesh Chaturthi Utsav', 'Ganpati sthapana, daily aarti and visarjan procession on the last day.', -70, 5, TIME '09:00', TIME '21:00', 'Ganesh Mandap', 'cld-sample-2.jpg', 'posted', NULL, 0),
  ('festival', 'Dev Diwali Deepdaan', 'Lighting 1,001 diyas around the society temple, followed by prasad.', 7, 1, TIME '18:30', TIME '21:00', 'Ram Mandir Premises', 'balloons.jpg', 'posted', NULL, 1),
  ('aarti', 'Tulsi Vivah Pooja', 'Tulsi Vivah ceremony with bhajan sandhya. All families welcome.', 4, 1, TIME '17:30', TIME '20:00', 'Society Temple', 'cld-sample-4.jpg', 'posted', NULL, 0),
  ('aarti', 'Monthly Satyanarayan Katha', 'Monthly katha and maha aarti. Prasad for everyone.', 18, 1, TIME '19:00', TIME '21:00', 'Community Hall', 'cld-sample-5.jpg', 'posted', NULL, 1),
  ('meeting', 'Annual General Meeting 2026-27', 'Accounts, elections and the plan for next year. Please attend.', 25, 1, TIME '10:00', TIME '13:00', 'Community Hall', 'sample.jpg', 'posted', NULL, 0),
  ('volunteer', 'Blood Donation Camp', 'With Red Cross Society. Volunteers needed for registration and refreshments.', 27, 1, TIME '09:00', TIME '15:00', 'Community Hall', 'cld-sample-3.jpg', 'posted', NULL, 0),
  ('cultural', 'Makar Sankranti Kite Festival', 'Terrace kite flying, undhiyu and jalebi for all members.', 58, 2, TIME '08:00', TIME '18:00', 'Society Terraces', 'cld-sample.jpg', 'scheduled', NULL, 0),
  ('volunteer', 'Annual Sports Day', 'Cricket, kabaddi and fun races for all ages.', 75, 1, TIME '07:30', TIME '13:00', 'Society Ground', 'bike.jpg', 'draft', NULL, 0),
  ('cultural', 'Society Picnic to Polo Forest', 'Day trip by bus. Cancelled because of the weather forecast.', 12, 1, TIME '06:30', TIME '20:00', 'Polo Forest', 'horses.jpg', 'cancelled', NULL, 0),
  ('festival', 'Holi Dhuleti Celebration', 'Organic colours, music and thandai.', 120, 1, TIME '09:00', TIME '13:00', 'Society Ground', 'kitten.jpg', 'draft', NULL, 0)
) AS e(cat, title, descr, day_offset, days, start_t, end_t, venue, img, status, reason, featured);

-- ---------- Notices (by Hetal) ----------
INSERT INTO notices (title, body, tag, event_id, status, audience, published_at, created_by, notified_at, created_at)
SELECT x.title, x.body, x.tag,
       CASE WHEN x.ev IS NOT NULL THEN (SELECT id FROM events WHERE title = x.ev AND created_by = (SELECT id FROM demo_creator)) END,
       x.status, 'all', CASE WHEN x.status = 'published' THEN NOW() - (x.ago || ' days')::interval END,
       (SELECT id FROM demo_users WHERE n = 2), NOW(), NOW() - (x.ago || ' days')::interval
FROM (VALUES
  ('Water Supply Off on Sunday', 'Water supply will be off from 10 AM to 4 PM on Sunday for tank cleaning. Please store water in advance.', 'important', NULL, 'published', 1),
  ('Volunteers Needed for Dev Diwali', 'We need 15 volunteers to arrange diyas and manage the crowd. Please register with Hetal Shah.', 'event', 'Dev Diwali Deepdaan', 'published', 2),
  ('Annual Subscription Reminder', 'Members are requested to pay the annual subscription of ₹1,200 before 30th November.', 'general', NULL, 'published', 6),
  ('Lift Maintenance in Wing B', 'The lift in Wing B will be under maintenance on Tuesday. Sorry for the trouble.', 'important', NULL, 'published', 12),
  ('Parking Rules During Festivals', 'Visitors must park outside the main gate during festival days.', 'general', NULL, 'draft', 0)
) AS x(title, body, tag, ev, status, ago);

-- ---------- Gallery (members' uploads: approved, waiting, rejected) ----------
INSERT INTO media_items (uploaded_by, category_id, event_id, media_type, cloudinary_public_id, media_url, caption, file_size_bytes,
                         privacy, status, moderated_by, moderated_at, rejection_reason, created_at)
SELECT (SELECT id FROM demo_users WHERE n = x.uploader),
       (SELECT id FROM event_categories WHERE code = x.cat),
       CASE WHEN x.ev IS NOT NULL THEN (SELECT id FROM events WHERE title = x.ev AND created_by = (SELECT id FROM demo_creator)) END,
       'photo', 'demo/' || x.img, 'https://res.cloudinary.com/demo/image/upload/w_1000,c_limit/' || x.img, x.caption, 300000 + x.uploader * 9000,
       'all_members', x.status,
       CASE WHEN x.status <> 'pending' THEN (SELECT id FROM demo_admin) END,
       CASE WHEN x.status <> 'pending' THEN NOW() - (x.ago || ' days')::interval + INTERVAL '3 hours' END,
       x.reason, NOW() - (x.ago || ' days')::interval
FROM (VALUES
  (4, 'cultural', 'Navratri Raas Garba Mahotsav', 'couple.jpg', 'Garba night with the family', 'approved', NULL, 38),
  (5, 'cultural', 'Navratri Raas Garba Mahotsav', 'balloons.jpg', 'Decorations on Dussehra', 'approved', NULL, 31),
  (6, 'festival', 'Ganesh Chaturthi Utsav', 'cld-sample-2.jpg', 'Ganpati Bappa Morya!', 'approved', NULL, 66),
  (7, 'festival', 'Ganesh Chaturthi Utsav', 'cld-sample-4.jpg', 'Visarjan procession', 'approved', NULL, 64),
  (8, 'aarti', NULL, 'cld-sample-5.jpg', 'Evening aarti at the temple', 'approved', NULL, 20),
  (9, 'volunteer', NULL, 'cld-sample-3.jpg', 'Tree plantation drive', 'approved', NULL, 15),
  (10, 'cultural', NULL, 'sample.jpg', 'Society garden in bloom', 'approved', NULL, 9),
  (11, 'festival', NULL, 'cld-sample.jpg', 'Rangoli competition entry', 'pending', NULL, 1),
  (12, 'cultural', NULL, 'dog.jpg', 'Our society friend Sheru', 'pending', NULL, 1),
  (13, 'volunteer', NULL, 'bike.jpg', 'Cycle rally to the lake', 'pending', NULL, 0),
  (14, 'cultural', NULL, 'kitten.jpg', 'Random photo', 'rejected', 'Not related to a society event.', 5),
  (15, 'festival', NULL, 'horses.jpg', 'Blurry crowd photo', 'rejected', 'The photo is too blurry, please upload a clearer one.', 4)
) AS x(uploader, cat, ev, img, caption, status, reason, ago);

-- ---------- Donations: 12 months, members (from the app or entered) and a few non-members ----------
-- Most are verified; this month has some pending ones to verify, and a few were rejected
INSERT INTO donations (donor_user_id, donor_name, amount, purpose, method, status, reference_no, donated_on,
                       confirmed_at, verified_by, entered_by, note, created_at)
SELECT CASE WHEN g.k % 6 = 5 THEN NULL ELSE (SELECT id FROM demo_users WHERE n = 2 + (g.m * 7 + g.k * 5) % 25) END,
       CASE WHEN g.k % 6 = 5 THEN (ARRAY['Shree Ambaji Traders', 'Jayesh Kaka (guest)', 'Laxmi Jewellers', 'Anonymous Bhakt'])[1 + (g.m + g.k) % 4] END,
       (ARRAY[101, 251, 501, 1001, 1100, 2100, 2500, 5001, 11000, 501, 1001, 251])[1 + (g.m * 3 + g.k * 7) % 12],
       (ARRAY['Festival', 'Aarti', 'Cultural', 'General Fund', 'Other', 'Festival'])[1 + (g.m + g.k * 2) % 6],
       (ARRAY['upi_app', 'upi_qr', 'cash', 'bank', 'cheque', 'upi_app'])[1 + (g.m * 5 + g.k) % 6],
       CASE WHEN g.m = 0 AND g.k >= 4 THEN 'pending' WHEN (g.m * 11 + g.k) % 17 = 0 THEN 'rejected' ELSE 'success' END,
       CASE (ARRAY['upi_app', 'upi_qr', 'cash', 'bank', 'cheque', 'upi_app'])[1 + (g.m * 5 + g.k) % 6]
         WHEN 'upi_app' THEN '9' || LPAD((g.m * 100 + g.k)::text, 11, '0')
         WHEN 'upi_qr' THEN '8' || LPAD((g.m * 100 + g.k)::text, 11, '0')
         WHEN 'bank' THEN 'NEFT' || LPAD((g.m * 100 + g.k)::text, 8, '0')
         WHEN 'cheque' THEN 'CHQ' || LPAD((g.m * 100 + g.k + 11000)::text, 6, '0')
       END,
       g.day,
       CASE WHEN NOT (g.m = 0 AND g.k >= 4) AND (g.m * 11 + g.k) % 17 <> 0 THEN g.day + INTERVAL '1 day 10 hours' END,
       CASE WHEN NOT (g.m = 0 AND g.k >= 4) THEN (SELECT id FROM demo_admin) END,
       CASE WHEN g.k % 3 = 0 THEN (SELECT id FROM demo_admin) END,
       CASE WHEN g.k % 6 = 5 THEN '[demo]' END,
       g.day + INTERVAL '9 hours'
FROM (
  SELECT m, k, LEAST(CURRENT_DATE, (DATE_TRUNC('month', CURRENT_DATE) - (m || ' months')::interval)::date + (k * 4 + m) % 27) AS day
  FROM generate_series(0, 11) m, generate_series(0, 6 + (m % 3)) k
) g;

-- ---------- Expenses: 12 months of the society's spending, this month's last two still to verify ----------
INSERT INTO society_transactions (txn_date, entry_type, amount, mode, reference_no, description, category, paid_to, status,
                                  verified_by, entered_by, created_at)
SELECT g.day, 'paid', x.amount + (g.m % 3) * 150, x.mode, 'DEMO-' || TO_CHAR(g.day, 'YYMM') || '-' || g.k, x.descr, x.cat, x.vendor,
       CASE WHEN g.m = 0 AND g.k >= 2 THEN 'pending' ELSE 'verified' END,
       CASE WHEN g.m = 0 AND g.k >= 2 THEN NULL ELSE (SELECT id FROM demo_admin) END,
       COALESCE((SELECT id FROM demo_admin), (SELECT id FROM demo_creator)), g.day + INTERVAL '12 hours'
FROM (
  SELECT m, k, LEAST(CURRENT_DATE, (DATE_TRUNC('month', CURRENT_DATE) - (m || ' months')::interval)::date + (k * 7 + 3) % 27) AS day
  FROM generate_series(0, 11) m, generate_series(0, 3) k
) g
JOIN (VALUES
  (0, 'Flowers and decoration for the temple', 'Decoration', 'Shiv Flower Decorators', 1200, 'cash'),
  (1, 'Prasad and snacks', 'Food', 'Sweet Mart', 1500, 'upi'),
  (2, 'Sound system and lights rent', 'Sound & Light', 'DJ Sound Services', 2200, 'bank'),
  (3, 'Garden and water pump maintenance', 'Maintenance', 'Patel Maintenance Works', 800, 'cheque')
) AS x(k, descr, cat, vendor, amount, mode) ON x.k = g.k;

-- ---------- Executive Requests: two waiting, one approved (Dhaval), one rejected ----------
INSERT INTO executive_applications (user_id, donation_amount, reference_no, reason, status, reviewed_by, reviewed_at, review_note, created_at)
SELECT (SELECT id FROM demo_users WHERE n = x.n), x.amount, x.ref, x.reason, x.status,
       CASE WHEN x.status <> 'pending' THEN (SELECT id FROM demo_admin) END,
       CASE WHEN x.status <> 'pending' THEN NOW() - (x.ago - 1 || ' days')::interval END,
       x.note, NOW() - (x.ago || ' days')::interval
FROM (VALUES
  (4, 11000, '912345678901', 'I want to help organise the festivals and manage the volunteers.', 'pending', NULL, 2),
  (5, 10001, '912345678902', 'I can handle the cultural programmes and the youth team.', 'pending', NULL, 1),
  (3, 11000, '912345678903', 'I have been a volunteer for five years and would like to handle the accounts.', 'approved', NULL, 120),
  (6, 5001, '912345678904', 'I would like to join the committee.', 'rejected', 'The donation is below the executive minimum.', 30)
) AS x(n, amount, ref, reason, status, note, ago);

-- ---------- Saved reports (Financial Reports → Generated Reports) ----------
INSERT INTO generated_reports (report_type, from_date, to_date, category, mode, generated_by, created_at)
VALUES
  ('summary', DATE_TRUNC('year', CURRENT_DATE)::date, CURRENT_DATE, NULL, NULL, (SELECT id FROM demo_users WHERE n = 3), NOW() - INTERVAL '2 days'),
  ('monthly', (CURRENT_DATE - INTERVAL '6 months')::date, CURRENT_DATE, NULL, NULL, (SELECT id FROM demo_users WHERE n = 3), NOW() - INTERVAL '5 days'),
  ('donation', NULL, NULL, 'Festival', 'upi', (SELECT id FROM demo_users WHERE n = 3), NOW() - INTERVAL '9 days');

-- ---------- Alerts for the Super Admin (the bell shows the pending counts; these are the in-app notifications) ----------
INSERT INTO notifications (type, title, body, ref_type, ref_id, audience, created_by, sent_at, created_at)
SELECT x.type, x.title, x.body, x.ref_type, NULL, 'selected', (SELECT id FROM demo_users WHERE n = x.n), NOW() - (x.mins || ' minutes')::interval,
       NOW() - (x.mins || ' minutes')::interval
FROM (VALUES
  ('donation', 'notify_admin_donation', '₹2,100 · Festival', 'donation', 11, 70),
  ('general', 'notify_admin_executive_request', 'Priya Joshi', 'executive_request', 5, 300),
  ('general', 'notify_admin_new_member', 'Amit Kotak', 'member', 26, 25)
) AS x(type, title, body, ref_type, n, mins);
INSERT INTO notification_recipients (notification_id, user_id)
SELECT n.id, a.id FROM notifications n, demo_admin a
WHERE n.created_by IN (SELECT id FROM demo_users) AND n.title LIKE 'notify_admin_%';

COMMIT;

-- What was added
SELECT 'users' AS what, COUNT(*) FROM demo_users
UNION ALL SELECT 'events', COUNT(*) FROM events WHERE created_by IN (SELECT id FROM demo_users)
UNION ALL SELECT 'notices', COUNT(*) FROM notices WHERE created_by IN (SELECT id FROM demo_users)
UNION ALL SELECT 'media', COUNT(*) FROM media_items WHERE uploaded_by IN (SELECT id FROM demo_users)
UNION ALL SELECT 'donations', COUNT(*) FROM donations WHERE donor_user_id IN (SELECT id FROM demo_users) OR note = '[demo]'
UNION ALL SELECT 'expenses', COUNT(*) FROM society_transactions WHERE reference_no LIKE 'DEMO-%'
UNION ALL SELECT 'executive requests', COUNT(*) FROM executive_applications WHERE user_id IN (SELECT id FROM demo_users);
