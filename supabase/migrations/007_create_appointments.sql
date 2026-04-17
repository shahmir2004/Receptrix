-- 007_create_appointments.sql
-- Appointment records. business_id added for multi-tenancy.
-- Integer PK preserved for FK compatibility with call_logs.
-- status CHECK values match AppointmentStatus enum in models.py exactly.

CREATE TABLE IF NOT EXISTS appointments (
    id                  SERIAL      PRIMARY KEY,
    business_id         UUID        REFERENCES businesses(id) ON DELETE SET NULL,
    caller_id           INTEGER     REFERENCES callers(id)    ON DELETE SET NULL,
    caller_name         TEXT        NOT NULL,
    caller_phone        TEXT        NOT NULL,
    service_name        TEXT        NOT NULL,
    appointment_date    TEXT        NOT NULL,   -- YYYY-MM-DD text (matches Python Pydantic field)
    appointment_time    TEXT        NOT NULL,   -- HH:MM text (matches Python Pydantic field)
    duration_minutes    INTEGER     NOT NULL    DEFAULT 30
                                    CHECK (duration_minutes > 0),
    status              TEXT        NOT NULL    DEFAULT 'scheduled'
                                    CHECK (status IN (
                                        'scheduled',
                                        'confirmed',
                                        'cancelled',
                                        'completed',
                                        'no_show'
                                    )),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
    reminder_sent       BOOLEAN     NOT NULL    DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_id
    ON appointments (business_id);

CREATE INDEX IF NOT EXISTS idx_appointments_caller_id
    ON appointments (caller_id);

CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date
    ON appointments (appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments (status);

COMMENT ON TABLE  appointments                  IS 'Scheduled appointments. status values mirror AppointmentStatus enum in models.py.';
COMMENT ON COLUMN appointments.business_id      IS 'NULL allowed during Phase A for legacy data. Phase C will backfill and add NOT NULL.';
COMMENT ON COLUMN appointments.appointment_date IS 'Stored as YYYY-MM-DD text string to match Python layer exactly.';
COMMENT ON COLUMN appointments.appointment_time IS 'Stored as HH:MM text string to match Python layer exactly.';
COMMENT ON COLUMN appointments.reminder_sent    IS 'Tracks whether reminder notification has been dispatched.';
