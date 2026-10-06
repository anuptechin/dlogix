-- Dlogix container sizes (CONTAINER_TYPE dropdown).
--   docker cp deploy/seed-data/container-types.sql ddecor_db:/tmp/ct.sql
--   docker exec -it ddecor_db psql -h 127.0.0.1 -U dlogix -d dlogix -f /tmp/ct.sql
-- Idempotent: replaces the CONTAINER_TYPE options with the approved set.
BEGIN;
DELETE FROM public.lookup_options WHERE category = 'CONTAINER_TYPE';
INSERT INTO public.lookup_options (id, category, label, sort_order) VALUES
  (gen_random_uuid(), 'CONTAINER_TYPE', '20′ GP', 0),
  (gen_random_uuid(), 'CONTAINER_TYPE', '40′ GP', 1),
  (gen_random_uuid(), 'CONTAINER_TYPE', '40′ HC', 2),
  (gen_random_uuid(), 'CONTAINER_TYPE', '20′ Reefer', 3),
  (gen_random_uuid(), 'CONTAINER_TYPE', '40′ Reefer', 4),
  (gen_random_uuid(), 'CONTAINER_TYPE', 'Open Top', 5),
  (gen_random_uuid(), 'CONTAINER_TYPE', 'Flat Rack', 6);
COMMIT;
