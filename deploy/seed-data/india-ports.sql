-- Indian export sea ports (POL for Sea FCL/LCL). kind=PORT, country=India.
--   docker cp deploy/seed-data/india-ports.sql ddecor_db:/tmp/inports.sql
--   docker exec -it ddecor_db psql -h 127.0.0.1 -U dlogix -d dlogix -f /tmp/inports.sql
-- Idempotent: each port inserted only if a PORT of that name doesn't already exist.
BEGIN;
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INNSA', 'Nhava Sheva (JNPT)', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Nhava Sheva (JNPT)'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INMUN', 'Mundra', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Mundra'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INBOM', 'Mumbai (BPT)', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Mumbai (BPT)'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INHZA', 'Hazira', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Hazira'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INPAV', 'Pipavav', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Pipavav'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INMAA', 'Chennai', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Chennai'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INKAT', 'Kattupalli', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Kattupalli'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INCCU', 'Kolkata', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Kolkata'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INCOK', 'Cochin (Kochi)', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Cochin (Kochi)'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INTUT', 'Tuticorin (V.O.C.)', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Tuticorin (V.O.C.)'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INVTZ', 'Visakhapatnam', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Visakhapatnam'));
INSERT INTO public.ports_locations (id, kind, code, name, country)
SELECT gen_random_uuid(), 'PORT', 'INIXY', 'Kandla', 'India'
WHERE NOT EXISTS (SELECT 1 FROM public.ports_locations WHERE kind='PORT' AND lower(name)=lower('Kandla'));
COMMIT;
