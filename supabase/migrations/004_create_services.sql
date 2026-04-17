-- 004_create_services.sql
-- Per-business service catalog. Replaces the services[] array in business_config.json.

CREATE TABLE IF NOT EXISTS services (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID            NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    price           NUMERIC(10,2)   NOT NULL DEFAULT 0,
    duration        INTEGER         NOT NULL DEFAULT 30
                                    CHECK (duration > 0),
    description     TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT services_business_name_unique
        UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_business_id
    ON services (business_id);

CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  services             IS 'Service catalog per business. Replaces the services[] array in business_config.json.';
COMMENT ON COLUMN services.price       IS 'Price in local currency units (e.g. PKR). NUMERIC to avoid floating-point drift.';
COMMENT ON COLUMN services.duration    IS 'Duration in minutes. Must be > 0.';
COMMENT ON COLUMN services.is_active   IS 'Soft-delete flag. Phase C queries should filter WHERE is_active = TRUE.';
