-- Removes the demo data added by demo_data.sql (and nothing else). Safe to run any time.
-- Demo rows are recognised by:
--   users            email 'demo.%@example.com'
--   donations        a demo donor, or note '[demo]' (donors who aren't members)
--   expenses         society_transactions.reference_no 'DEMO-%'
--   everything else  made by a demo user (events, notices, media, requests, reports, notifications, activity log)

BEGIN;

DROP TABLE IF EXISTS demo_users;
CREATE TEMP TABLE demo_users AS SELECT id FROM users WHERE email LIKE 'demo.%@example.com';
DROP TABLE IF EXISTS demo_events;
CREATE TEMP TABLE demo_events AS SELECT id FROM events WHERE created_by IN (SELECT id FROM demo_users);
DROP TABLE IF EXISTS demo_notices;
CREATE TEMP TABLE demo_notices AS SELECT id FROM notices WHERE created_by IN (SELECT id FROM demo_users);
DROP TABLE IF EXISTS demo_donations;
CREATE TEMP TABLE demo_donations AS
  SELECT id FROM donations WHERE donor_user_id IN (SELECT id FROM demo_users) OR note = '[demo]';
DROP TABLE IF EXISTS demo_expenses;
CREATE TEMP TABLE demo_expenses AS SELECT id FROM society_transactions WHERE reference_no LIKE 'DEMO-%';
DROP TABLE IF EXISTS demo_media;
CREATE TEMP TABLE demo_media AS SELECT id FROM media_items WHERE uploaded_by IN (SELECT id FROM demo_users);
DROP TABLE IF EXISTS demo_requests;
CREATE TEMP TABLE demo_requests AS SELECT id FROM executive_applications WHERE user_id IN (SELECT id FROM demo_users);

-- Activity log lines by demo users, or about demo records
DELETE FROM audit_logs
WHERE user_id IN (SELECT id FROM demo_users)
   OR (table_name = 'users' AND record_id IN (SELECT id FROM demo_users))
   OR (table_name = 'events' AND record_id IN (SELECT id FROM demo_events))
   OR (table_name = 'notices' AND record_id IN (SELECT id FROM demo_notices))
   OR (table_name = 'donations' AND record_id IN (SELECT id FROM demo_donations))
   OR (table_name = 'society_transactions' AND record_id IN (SELECT id FROM demo_expenses))
   OR (table_name = 'media_items' AND record_id IN (SELECT id FROM demo_media))
   OR (table_name = 'executive_applications' AND record_id IN (SELECT id FROM demo_requests));

-- Notifications sent by demo users or about demo content
DELETE FROM notifications
WHERE created_by IN (SELECT id FROM demo_users)
   OR (ref_type = 'event' AND ref_id IN (SELECT id FROM demo_events))
   OR (ref_type = 'notice' AND ref_id IN (SELECT id FROM demo_notices))
   OR (ref_type = 'media' AND ref_id IN (SELECT id FROM demo_media))
   OR (ref_type = 'donation' AND ref_id IN (SELECT id FROM demo_donations));

DELETE FROM generated_reports WHERE generated_by IN (SELECT id FROM demo_users);
DELETE FROM executive_permissions WHERE user_id IN (SELECT id FROM demo_users);
DELETE FROM executive_applications WHERE id IN (SELECT id FROM demo_requests);
DELETE FROM society_transactions WHERE id IN (SELECT id FROM demo_expenses) OR donation_id IN (SELECT id FROM demo_donations);
DELETE FROM donations WHERE id IN (SELECT id FROM demo_donations);
DELETE FROM media_items WHERE id IN (SELECT id FROM demo_media);
DELETE FROM event_images WHERE event_id IN (SELECT id FROM demo_events);
DELETE FROM notice_recipients WHERE notice_id IN (SELECT id FROM demo_notices);
UPDATE notices SET event_id = NULL WHERE event_id IN (SELECT id FROM demo_events);
DELETE FROM notices WHERE id IN (SELECT id FROM demo_notices);
DELETE FROM events WHERE id IN (SELECT id FROM demo_events);
DELETE FROM users WHERE id IN (SELECT id FROM demo_users); -- profiles, devices, notification copies go with them

COMMIT;
