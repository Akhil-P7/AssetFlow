-- AssetFlow — PostgreSQL initialization script
-- Runs automatically on first docker-compose up
-- Creates required extensions for the application

CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- required for booking exclusion constraint
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive email column
