-- 005_create_legacy_bookings.sql
-- Legacy bookings table. Kept for backward API compatibility (/book, /bookings endpoints).
-- No business_id; this table is single-tenant legacy data only.
-- Do NOT add new features here; use appointments table for all new work.

CREATE TABLE IF NOT EXISTS bookings (
    id          SERIAL      PRIMARY KEY,
    name        TEXT        NOT NULL,
    service     TEXT        NOT NULL,
    date        TEXT        NOT NULL,   -- stored as YYYY-MM-DD text (mirrors SQLite schema)
    "time"      TEXT        NOT NULL,   -- stored as HH:MM text (mirrors SQLite schema)
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bookings IS 'Legacy bookings table. Preserved for backward API compatibility only. New code should use appointments table.';
