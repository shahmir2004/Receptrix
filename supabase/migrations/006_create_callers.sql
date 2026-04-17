-- 006_create_callers.sql
-- Caller/customer registry. business_id added for multi-tenancy.
-- Integer PK preserved for FK compatibility with call_logs and appointments.
-- business_id is nullable in Phase A; Phase C will backfill and add NOT NULL.

CREATE TABLE IF NOT EXISTS callers (
    id                  SERIAL      PRIMARY KEY,
    business_id         UUID        REFERENCES businesses(id) ON DELETE SET NULL,
    phone_number        TEXT        NOT NULL,
    name                TEXT,
    email               TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_calls         INTEGER     NOT NULL DEFAULT 0
                                    CHECK (total_calls >= 0),
    total_appointments  INTEGER     NOT NULL DEFAULT 0
                                    CHECK (total_appointments >= 0),

    -- Within a single business, a phone number must be unique
    -- (Same phone number can be a caller at multiple businesses)
    CONSTRAINT callers_business_phone_unique
        UNIQUE (business_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_callers_business_id
    ON callers (business_id);

CREATE INDEX IF NOT EXISTS idx_callers_phone_number
    ON callers (phone_number);

CREATE TRIGGER callers_updated_at
    BEFORE UPDATE ON callers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  callers              IS 'Caller/customer registry. One record per phone number per business.';
COMMENT ON COLUMN callers.business_id  IS 'NULL allowed during Phase A for legacy single-tenant data. Phase C will backfill and add NOT NULL.';
COMMENT ON COLUMN callers.phone_number IS 'E.164 format preferred (e.g. +923001234567).';
