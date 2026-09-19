-- Creates the LPRMS role and database for local development.
-- Run once as the postgres superuser.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lprms') THEN
    CREATE ROLE lprms LOGIN PASSWORD 'lprms_dev_pw';
  END IF;
END$$;

SELECT 'CREATE DATABASE lprms OWNER lprms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lprms')\gexec

GRANT ALL PRIVILEGES ON DATABASE lprms TO lprms;
