-- Sample events and notices for development. Dates are relative to today, so the data never goes stale.
-- Safe to run again: the sample rows (matched by title) are removed first.
-- Posters: copy the images in frontend/mobile/assets to backend/uploads as
--   event3.jpg → event-diwali.jpg, event2.jpg → event-ganesh.jpg, event1.jpg → event-aarti.jpg

-- Creator: an admin / executive if there is one, otherwise the first member who finished sign-up
SET @creator = (
  SELECT id FROM users
  WHERE is_deleted = 0
  ORDER BY role_id, signup_step = 'completed' DESC, id
  LIMIT 1
);

DELETE FROM notices WHERE title IN (
  'Water Supply Off on Saturday – Tank Cleaning',
  'Rangoli Competition – Last Day to Register',
  'Annual General Meeting – Attendance Requested',
  'Festival Fund Contribution for November',
  'Parking Arrangements During Festival Days'
);

DELETE FROM events WHERE title IN (
  'Diwali Deepotsav & Rangoli Competition',
  'Sankashti Chaturthi Ganesh Pooja',
  'Dev Diwali Maha Aarti & Deepdaan',
  'Annual General Meeting 2026-27',
  'Sharad Purnima Raas Garba'
);

-- Categories: 1 aarti, 2 festival, 3 cultural, 4 meeting, 5 volunteer
INSERT INTO events
  (category_id, title, description, event_date, end_date, start_time, end_time,
   venue_name, venue_address, map_link, poster_url, status, posted_at, approved_by, approved_at, created_by)
VALUES
  -- Ongoing (yesterday to tomorrow)
  (2, 'Diwali Deepotsav & Rangoli Competition',
   'Three evenings of Diwali celebrations for the whole society. Every evening starts with diya lighting and Lakshmi aarti, followed by fireworks in the open ground (eco-friendly crackers only). The Rangoli Competition is on the second evening with prizes for the Kids (under 14), Women and Open categories. Bring your own colours; each team gets a 4 x 4 ft space. Sweets and prasad will be served on all three days.',
   DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), '18:30:00', '22:00:00',
   'Mandal Chowk', 'Gamtola, Vadodara, Gujarat', 'https://maps.google.com/?q=Gamtola+Vadodara',
   'event-diwali.jpg', 'posted', NOW(), @creator, NOW(), @creator),

  (1, 'Sankashti Chaturthi Ganesh Pooja',
   'Monthly Sankashti Chaturthi pooja of Shri Ganesh with Atharvashirsha path, 108 modak naivedya and maha aarti after moonrise. Families are welcome to sponsor the pooja; please give your name to any executive member by the day before. Prasad will be distributed after the aarti.',
   DATE_ADD(CURDATE(), INTERVAL 4 DAY), NULL, '19:00:00', '20:30:00',
   'Ganesh Mandir', 'Mandal Chowk, Gamtola, Vadodara, Gujarat', 'https://maps.google.com/?q=Gamtola+Vadodara',
   'event-ganesh.jpg', 'posted', NOW(), @creator, NOW(), @creator),

  (2, 'Dev Diwali Maha Aarti & Deepdaan',
   'Celebrate Dev Diwali with a maha aarti of 1,001 diyas and deepdaan at the temple. Members are requested to bring one diya per family; oil and wicks will be provided. A short bhajan sandhya by the Mandal''s bhajan group will follow the aarti.',
   DATE_ADD(CURDATE(), INTERVAL 14 DAY), NULL, '19:00:00', '21:00:00',
   'Ram Mandir Premises', 'Gamtola, Vadodara, Gujarat', 'https://maps.google.com/?q=Gamtola+Vadodara',
   'event-aarti.jpg', 'posted', NOW(), @creator, NOW(), @creator),

  (4, 'Annual General Meeting 2026-27',
   'Agenda: 1) Accounts for 2025-26 and the auditor''s report, 2) Budget for festivals in 2026-27, 3) Election of the new executive committee, 4) Members'' suggestions. Every member family is requested to attend. Tea and snacks will be served.',
   DATE_ADD(CURDATE(), INTERVAL 20 DAY), NULL, '10:00:00', '13:00:00',
   'Community Hall', 'First floor, Mandal Bhavan, Gamtola, Vadodara, Gujarat', 'https://maps.google.com/?q=Gamtola+Vadodara',
   NULL, 'posted', NOW(), @creator, NOW(), @creator),

  -- Completed
  (3, 'Sharad Purnima Raas Garba',
   'Raas Garba under the full moon with live dhol and singers, followed by doodh-poha prasad at midnight. Thank you to everyone who joined and to the volunteers who managed the arrangements.',
   DATE_SUB(CURDATE(), INTERVAL 26 DAY), NULL, '20:00:00', '23:30:00',
   'Mandal Chowk', 'Gamtola, Vadodara, Gujarat', 'https://maps.google.com/?q=Gamtola+Vadodara',
   NULL, 'posted', NOW(), @creator, NOW(), @creator);

INSERT INTO notices (title, body, tag, event_id, audience, status, published_at, created_by)
VALUES
  ('Water Supply Off on Saturday – Tank Cleaning',
   'The overhead water tank will be cleaned this Saturday, so water supply will be off from 10:00 AM to 4:00 PM. Please store enough water in advance. We regret the inconvenience.',
   'important', NULL, 'all', 'published', DATE_SUB(NOW(), INTERVAL 2 HOUR), @creator),

  ('Rangoli Competition – Last Day to Register',
   'Today is the last day to register for the Diwali Rangoli Competition. Send your team name, category (Kids / Women / Open) and number of members to any executive member. Judging starts at 8:00 PM tomorrow.',
   'event', (SELECT id FROM events WHERE title = 'Diwali Deepotsav & Rangoli Competition' ORDER BY id DESC LIMIT 1),
   'all', 'published', DATE_SUB(NOW(), INTERVAL 1 DAY), @creator),

  ('Annual General Meeting – Attendance Requested',
   'The Annual General Meeting will decide the festival budget and elect the new executive committee. At least one member from every family is requested to attend. Members who want an item added to the agenda should write to the secretary at least 7 days before the meeting.',
   'important', (SELECT id FROM events WHERE title = 'Annual General Meeting 2026-27' ORDER BY id DESC LIMIT 1),
   'all', 'published', DATE_SUB(NOW(), INTERVAL 2 DAY), @creator),

  ('Festival Fund Contribution for November',
   'Members are requested to pay the festival fund contribution of Rs. 501 per family for Diwali and Dev Diwali by the 20th of this month. You can pay in cash at the Mandal office (7:00 PM to 9:00 PM) or by UPI from the Donate section of the app. A receipt will be issued for every payment.',
   'general', NULL, 'all', 'published', DATE_SUB(NOW(), INTERVAL 4 DAY), @creator),

  ('Parking Arrangements During Festival Days',
   'During the festival days, Mandal Chowk will be closed to vehicles from 5:00 PM to 11:00 PM. Please park two-wheelers in the school ground and four-wheelers along the main road. Volunteers will guide you. Kindly keep the fire lane near the temple clear at all times.',
   'general', NULL, 'all', 'published', DATE_SUB(NOW(), INTERVAL 6 DAY), @creator);
