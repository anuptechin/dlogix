-- Dlogix End-User accounts (role END_USER). OTP login; no password set.
--   docker cp deploy/seed-data/end-users.sql ddecor_db:/tmp/eu.sql
--   docker exec -it ddecor_db psql -h 127.0.0.1 -U dlogix -d dlogix -f /tmp/eu.sql
-- Idempotent: ON CONFLICT (email) DO NOTHING, so re-running is safe.
BEGIN;
INSERT INTO public.users (id, name, email, role, is_active) VALUES
  (gen_random_uuid(), 'Yogita Chinchkar', 'yogita.chinchkar@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Anand Jha', 'anand.jha@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Sandeepb', 'sandeepb@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Geetap', 'geetap@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Francis Mendes', 'francis.mendes@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Pamelaf', 'pamelaf@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Poornima Raut', 'poornima.raut@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Pooja Bhargude', 'pooja.bhargude@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Aakash Mahadik', 'aakash.mahadik@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Anil Kumar', 'anil.kumar@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Shafi Sayyed', 'shafi.sayyed@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Dhondiram', 'dhondiram@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Naresh Parab', 'naresh.parab@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Sachin Ingulkar', 'sachin.ingulkar@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Sandhya Bhagat', 'sandhya.bhagat@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Deepak H', 'deepak.h@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Aditya Mazumdar', 'aditya.mazumdar@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Sanjay Bhansali', 'sanjay.bhansali@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Amit Jadhav', 'amit.jadhav@ddecor.com', 'END_USER', true),
  (gen_random_uuid(), 'Sneha Pai', 'sneha@ddecor.com', 'END_USER', true)
ON CONFLICT (email) DO NOTHING;
COMMIT;
