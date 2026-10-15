-- Indian export airports (origin airport for Air). kind=AIRPORT, country=India.
--   docker cp deploy/seed-data/india-airports.sql ddecor_db:/tmp/inair.sql
--   docker exec -it ddecor_db psql -h 127.0.0.1 -U dlogix -d dlogix -f /tmp/inair.sql
-- Idempotent: each airport inserted only if an AIRPORT of that name doesn't already exist.
BEGIN;
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'BOM', 'Mumbai (Chhatrapati Shivaji)', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Mumbai (Chhatrapati Shivaji)'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'NMI', 'Navi Mumbai', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Navi Mumbai'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'DEL', 'Delhi (Indira Gandhi)', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Delhi (Indira Gandhi)'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'MAA', 'Chennai', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Chennai'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'BLR', 'Bengaluru', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Bengaluru'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'HYD', 'Hyderabad', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Hyderabad'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'CCU', 'Kolkata', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Kolkata'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'AIRPORT', 'AMD', 'Ahmedabad', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='AIRPORT' AND lower(name)=lower('Ahmedabad'));
COMMIT;
