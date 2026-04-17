-- 009_create_conversation_states.sql
-- Ephemeral in-call conversation state. No business_id needed (transient, keyed by call_sid only).
-- messages and extracted_info stored as JSONB (upgrade from TEXT-serialized JSON in SQLite).
-- state CHECK values match ConversationState enum in models.py exactly.

CREATE TABLE IF NOT EXISTS conversation_states (
    call_sid            TEXT        PRIMARY KEY,
    caller_phone        TEXT        NOT NULL,
    state               TEXT        NOT NULL    DEFAULT 'greeting'
                                    CHECK (state IN (
                                        'greeting',
                                        'gathering_info',
                                        'checking_availability',
                                        'confirming_booking',
                                        'providing_info',
                                        'farewell'
                                    )),
    caller_name         TEXT,
    requested_service   TEXT,
    requested_date      TEXT,
    requested_time      TEXT,
    messages            JSONB       NOT NULL    DEFAULT '[]'::JSONB,
    extracted_info      JSONB       NOT NULL    DEFAULT '{}'::JSONB,
    created_at          TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL    DEFAULT NOW()
);

CREATE TRIGGER conversation_states_updated_at
    BEFORE UPDATE ON conversation_states
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  conversation_states                IS 'Ephemeral call state. Rows inserted on call start, deleted on call end. No business_id needed.';
COMMENT ON COLUMN conversation_states.state          IS 'Values mirror ConversationState enum in models.py.';
COMMENT ON COLUMN conversation_states.messages       IS 'JSONB array of {role, content} message history. Default [] avoids null checks.';
COMMENT ON COLUMN conversation_states.extracted_info IS 'JSONB dict of caller-provided extracted data. Default {} avoids null checks.';
