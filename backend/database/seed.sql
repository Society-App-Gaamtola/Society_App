-- Reference rows the app needs on a fresh database (run after schema.sql).
-- Safe to run again: existing rows are left as they are.

INSERT INTO app_settings (id, setting_key, setting_value, description, created_at, updated_at) VALUES (1, 'executive_min_donation', NULL, 'OPEN POINT: Executive upgrade amount, 10000 or 10001. Confirm with client.', '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO app_settings (id, setting_key, setting_value, description, created_at, updated_at) VALUES (2, 'cash_entry_mode', NULL, 'OPEN POINT: super_admin_only or executive_as_permitted. Confirm with client.', '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO app_settings (id, setting_key, setting_value, description, created_at, updated_at) VALUES (3, 'society_name', NULL, 'OPEN POINT: final spelling of the society name. Confirm with client.', '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (1, 'aarti', 'Aarti', '#E67E22', 1, 1, 0, '2026-11-02 10:53:02+05:30', '2026-11-02 10:53:02+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (2, 'festival', 'Festival', '#C0392B', 2, 1, 0, '2026-11-02 10:53:02+05:30', '2026-11-02 10:53:02+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (3, 'cultural', 'Cultural', '#8E44AD', 3, 1, 0, '2026-11-02 10:53:02+05:30', '2026-11-02 10:53:02+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (4, 'meeting', 'Meeting', '#2980B9', 4, 1, 0, '2026-11-02 10:53:02+05:30', '2026-11-02 10:53:02+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (5, 'volunteer', 'Volunteer Activities', '#27AE60', 5, 1, 0, '2026-11-02 10:53:02+05:30', '2026-11-02 10:53:02+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (6, 'garba', 'Garba', '#D35400', 6, 1, 0, '2026-11-18 10:00:00+05:30', '2026-11-18 10:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (7, 'sandhya_aarti', 'Sandhya Aarti', '#F39C12', 7, 1, 0, '2026-11-18 10:00:00+05:30', '2026-11-18 10:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (8, 'prasad_vitaran', 'Prasad Vitaran', '#B7950B', 8, 1, 0, '2026-11-18 10:00:00+05:30', '2026-11-18 10:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (9, 'batuk_bhojan', 'Batuk Bhojan', '#A04000', 9, 1, 0, '2026-11-18 10:00:00+05:30', '2026-11-18 10:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO event_categories (id, code, name, color, sort_order, is_active, is_deleted, created_at, updated_at) VALUES (10, 'other_events', 'Other Society Events', '#7F8C8D', 10, 1, 0, '2026-11-18 10:00:00+05:30', '2026-11-18 10:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (1, 'events', 'Events', 'Create and manage events and Aarti', 1, 0, '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (2, 'notices', 'Notices', 'Publish notices', 1, 0, '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (3, 'donations', 'Donations', 'View donations and reports', 1, 0, '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (4, 'media', 'Media', 'Moderate photos and videos', 1, 0, '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (5, 'transactions', 'Transactions', 'Society transactions and reports', 1, 0, '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (6, 'settings', 'Settings', 'Settings the Super Admin chooses to allow', 1, 0, '2026-11-02 11:01:34+05:30', '2026-11-02 11:01:34+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (7, 'expenses', 'Expenses', 'Society expenses (cash book)', 1, 0, '2026-11-17 12:00:00+05:30', '2026-11-17 12:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO modules (id, code, name, description, is_active, is_deleted, created_at, updated_at) VALUES (8, 'reports', 'Reports', 'Financial reports', 1, 0, '2026-11-17 12:00:00+05:30', '2026-11-17 12:00:00+05:30') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, code, name, is_active, is_deleted) VALUES (1, 'super_admin', 'Super Admin', 1, 0) ON CONFLICT DO NOTHING;
INSERT INTO roles (id, code, name, is_active, is_deleted) VALUES (2, 'executive', 'Executive Member', 1, 0) ON CONFLICT DO NOTHING;
INSERT INTO roles (id, code, name, is_active, is_deleted) VALUES (3, 'member', 'Normal Member', 1, 0) ON CONFLICT DO NOTHING;
INSERT INTO roles (id, code, name, is_active, is_deleted) VALUES (4, 'guest', 'Guest', 1, 0) ON CONFLICT DO NOTHING;

-- Identity counters continue after the ids above
SELECT setval(pg_get_serial_sequence('modules', 'id'), (SELECT MAX(id) FROM modules));
SELECT setval(pg_get_serial_sequence('event_categories', 'id'), (SELECT MAX(id) FROM event_categories));
SELECT setval(pg_get_serial_sequence('app_settings', 'id'), (SELECT MAX(id) FROM app_settings));
