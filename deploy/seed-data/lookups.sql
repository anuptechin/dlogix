-- Dlogix dropdown lookups (container types, package types, service scope, etc.)
-- Snapshot from dev. Populates the enquiry-form dropdowns in prod.
--   docker cp deploy/seed-data/lookups.sql ddecor_db:/tmp/lookups.sql
--   docker exec -it ddecor_db psql -h 127.0.0.1 -U dlogix -d dlogix -f /tmp/lookups.sql
-- Idempotent: replaces all lookup_options rows (they're string-referenced, safe).
BEGIN;
DELETE FROM public.lookup_options;
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: lookup_options; Type: TABLE DATA; Schema: public; Owner: lprms
--

INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('afae51b1-d361-489d-98f5-6e70d755c78d', 'PACKAGE_TYPE', NULL, 'Cartons', NULL, 0, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('5d42e8a6-a3ae-4c0e-8621-fa0caadfb411', 'PACKAGE_TYPE', NULL, 'Rolls', NULL, 1, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('7b59a0dc-564f-4af7-afc0-f567389277d8', 'PACKAGE_TYPE', NULL, 'Pallets', NULL, 2, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('3063b8c7-b012-4e6e-aa85-536c92a60942', 'PACKAGE_TYPE', NULL, 'Crates', NULL, 3, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('ed602506-825c-4241-b3d2-b485d4ab45e1', 'PACKAGE_TYPE', NULL, 'Bundles', NULL, 4, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('eeee7c9b-aa62-45d3-a554-09eb8c1970aa', 'PACKAGE_TYPE', NULL, 'Bales', NULL, 5, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('fc039564-4b36-467e-8e0f-f315d213553c', 'PACKAGE_TYPE', NULL, 'Drums', NULL, 6, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('c6ab7b62-03f1-4d77-9571-9813a0cf3ae2', 'NATURE_OF_CARGO', NULL, 'Commercial Shipment', NULL, 0, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('2093b72c-a3b9-4663-9fd6-a1d03e21bd62', 'NATURE_OF_CARGO', NULL, 'Sample', NULL, 1, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('e3d2b7b5-34cc-4a12-a658-710ca829eedc', 'NATURE_OF_CARGO', NULL, 'Raw Material', NULL, 2, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('b7d7f6e0-bfe4-4a72-802a-711089742851', 'NATURE_OF_CARGO', NULL, 'Machinery', NULL, 3, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('b8d1394c-82ad-4212-ab60-1cdfb6b13e14', 'NATURE_OF_CARGO', NULL, 'Spare Parts', NULL, 4, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('532a4ff1-aed8-4773-8ad2-b718f33fdaea', 'NATURE_OF_CARGO', NULL, 'Chemicals', NULL, 5, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('59970031-dde8-47b4-b06c-92f11e57c88e', 'NATURE_OF_CARGO', NULL, 'Others', NULL, 6, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('71d7448f-6ca6-4ac3-b417-06f192f2c4d9', 'COMMODITY', NULL, 'Home Furnishings', NULL, 0, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('2c0f0a72-0e86-4303-895b-a39ea2c229fd', 'COMMODITY', NULL, 'Upholstery Fabric', NULL, 1, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('1bf3fc31-e807-493e-8495-f1c92146d810', 'COMMODITY', NULL, 'Curtains', NULL, 2, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('01b6fb89-909c-429c-a9ba-72427063080d', 'COMMODITY', NULL, 'Yarn', NULL, 3, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('34e8ea64-cae1-41dc-9a07-46083c2c8699', 'COMMODITY', NULL, 'Accessories', NULL, 4, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('01ad5f73-7754-40d1-b542-8cdf21e6f7b0', 'COMMODITY', NULL, 'Machinery', NULL, 5, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('3d53ad1b-24ea-4402-a2c6-2aac79c1e303', 'SERVICE_SCOPE', NULL, 'Airport to Airport', NULL, 0, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('477b62da-6ca8-4800-81f6-628560f781cd', 'SERVICE_SCOPE', NULL, 'Door to Airport', NULL, 1, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('b6bf00d4-4352-447a-b201-2b510806ac60', 'SERVICE_SCOPE', NULL, 'Airport to Door', NULL, 2, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('4986aea9-56d8-4589-ae0d-89e83eea3a38', 'SERVICE_SCOPE', NULL, 'Door to Door', NULL, 3, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('a604ae41-772f-402e-91a1-208b43cdd15b', 'SERVICE_SCOPE', NULL, 'Port to Port', NULL, 4, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('e10ba0ea-675c-45db-9f4b-87e4e6d03002', 'SERVICE_SCOPE', NULL, 'Door to Port', NULL, 5, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('f61ed363-95a3-4fe1-b3d9-1827f767811c', 'SERVICE_SCOPE', NULL, 'Port to Door', NULL, 6, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('f2ac6c6b-a8ef-44ef-9d46-4084dba26f33', 'BUSINESS_UNIT', NULL, 'Home Textiles', NULL, 0, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('95578cc0-300f-4554-b88e-6a17fe936df6', 'BUSINESS_UNIT', NULL, 'Exports', NULL, 1, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('76460786-2dd5-427b-af13-174640f587ab', 'BUSINESS_UNIT', NULL, 'Imports', NULL, 2, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('56de0e57-3f81-47a3-ab00-1862c4f059d5', 'BUSINESS_UNIT', NULL, 'Retail', NULL, 3, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('4ecec776-d557-4d33-8ecc-86a43bcc51dd', 'CONTAINER_TYPE', NULL, '20′ GP', NULL, 0, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('b0b08df2-da5c-464c-8015-c274dc72fcd7', 'CONTAINER_TYPE', NULL, '40′ GP', NULL, 1, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('1ea61f52-bb50-4e97-ba78-f2748e17cf3b', 'CONTAINER_TYPE', NULL, '40′ HC', NULL, 2, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('54e03902-598f-4fea-b05c-5cb3e4e5374b', 'CONTAINER_TYPE', NULL, '20′ Reefer', NULL, 3, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('329017ed-2603-47da-b6db-4c6e28cd87e7', 'CONTAINER_TYPE', NULL, '40′ Reefer', NULL, 4, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('88830ff4-6d61-461a-b79b-b48f9db47a60', 'CONTAINER_TYPE', NULL, 'Open Top', NULL, 5, true);
INSERT INTO public.lookup_options (id, category, code, label, meta, sort_order, is_active) VALUES ('1ab8d764-7fbb-4f24-a66b-ebc10bcdb726', 'CONTAINER_TYPE', NULL, 'Flat Rack', NULL, 6, true);


--
-- PostgreSQL database dump complete
--
COMMIT;
