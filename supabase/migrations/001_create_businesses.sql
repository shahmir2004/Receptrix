-- 001_create_businesses.sql
-- Core tenant table. working_hours stored as JSONB to mirror business_config.json shape.
-- Also defines set_updated_at() trigger function reused by all subsequent migration files.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- ensures gen_random_uuid() is available

CREATE TABLE IF NOT EXISTS businesses (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT        NOT NULL,
    phone               TEXT,
    email               TEXT,
    address             TEXT,
    timezone            TEXT        NOT NULL DEFAULT 'Asia/Karachi',
    greeting_message    TEXT,
    -- JSONB shape: {"monday":"9:00 AM - 6:00 PM", ..., "sunday":"Closed"}
    working_hours       JSONB       NOT NULL DEFAULT '{}'::JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function defined once here, reused by all subsequent CREATE TRIGGER statements
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  businesses               IS 'One row per tenant business.';
COMMENT ON COLUMN businesses.working_hours IS 'JSONB map of day-of-week → hours string, e.g. {"monday":"9:00 AM - 6:00 PM","sunday":"Closed"}';
