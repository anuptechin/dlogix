-- Add DDU (Delivered Duty Unpaid) incoterm — idempotent.
-- Load (on the server, into the shared ddecor_db):
--   docker cp deploy/seed-data/incoterms-ddu.sql ddecor_db:/tmp/incoterms-ddu.sql
--   docker exec ddecor_db psql -U dlogix -d dlogix -f /tmp/incoterms-ddu.sql
INSERT INTO incoterms (id, code, name, shown_fields, sort_order, is_active)
VALUES (
  gen_random_uuid(),
  'DDU',
  'Delivered Duty Unpaid',
  '["Delivery Address","Final Transport","Duty Responsibility"]'::jsonb,
  10,
  true
)
ON CONFLICT (code) DO NOTHING;
