-- 008_create_call_logs.sql
-- Call log records. business_id added for multi-tenancy.
-- Integer PK preserved for FK compatibility.
-- call_status CHECK values match CallStatus enum in models.py exactly.

CREATE TABLE IF NOT EXISTS call_logs (
    id                  SERIAL      PRIMARY KEY,
    business_id         UUID        REFERENCES businesses(id)   ON DELETE SET NULL,
    call_sid            TEXT        NOT NULL UNIQUE,
    caller_id           INTEGER     REFERENCES callers(id)      ON DELETE SET NULL,
    caller_phone        TEXT        NOT NULL,
    call_status         TEXT        NOT NULL
                                    CHECK (call_status IN (
                                        'incoming',
                                        'in_progress',
                                        'completed',
                                        'missed',
                                        'failed'
                                    )),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    duration_seconds    INTEGER     CHECK (duration_seconds >= 0),
    transcript          TEXT,
    summary             TEXT,
    appointment_created BOOLEAN     NOT NULL DEFAULT FALSE,
    appointment_id      INTEGER     REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_call_logs_business_id
    ON call_logs (business_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id
    ON call_logs (caller_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_started_at
    ON call_logs (started_at DESC);

COMMENT ON TABLE  call_logs                     IS 'Full call records including transcript and summary.';
COMMENT ON COLUMN call_logs.call_sid            IS 'Twilio/SignalWire Call SID. Globally unique across all calls.';
COMMENT ON COLUMN call_logs.call_status         IS 'Values mirror CallStatus enum in models.py.';
COMMENT ON COLUMN call_logs.business_id         IS 'NULL allowed during Phase A for legacy data.';
COMMENT ON COLUMN call_logs.appointment_created IS 'TRUE if this call resulted in a new appointment being booked.';
