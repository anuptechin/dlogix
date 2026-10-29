-- Charge types needed for the simplified Air export quote (Air Freight, AWB Charges).
--   docker cp deploy/seed-data/charge-types-air.sql ddecor_db:/tmp/ct-air.sql
--   docker exec -it ddecor_db psql -h 127.0.0.1 -U dlogix -d dlogix -f /tmp/ct-air.sql
-- Idempotent: inserts each only if a charge type of that name doesn't exist.
BEGIN;
INSERT INTO public.charge_types (id, name, unit, category, applies_to_mode, is_active)
SELECT gen_random_uuid(), 'Air Freight', 'per_kg', 'FREIGHT', ARRAY['AIR']::"ShipmentMode"[], true
WHERE NOT EXISTS (SELECT 1 FROM public.charge_types WHERE name = 'Air Freight');

INSERT INTO public.charge_types (id, name, unit, category, applies_to_mode, is_active)
SELECT gen_random_uuid(), 'AWB Charges', 'flat', 'LOCAL', ARRAY['AIR']::"ShipmentMode"[], true
WHERE NOT EXISTS (SELECT 1 FROM public.charge_types WHERE name = 'AWB Charges');
COMMIT;
