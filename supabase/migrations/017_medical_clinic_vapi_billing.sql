-- 017_medical_clinic_vapi_billing.sql
-- Production demo schema for US medical clinics, Lemon Squeezy billing, and Vapi voice.

ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'medical_clinic'
        CHECK (business_type IN (
            'medical_clinic',
            'dental_clinic',
            'urgent_care',
            'specialist_practice',
            'mental_health',
            'other_healthcare'
        )),
    ADD COLUMN IF NOT EXISTS hipaa_mode BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS voice_features_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE businesses
SET business_type = COALESCE(NULLIF(business_type, ''), 'medical_clinic'),
    hipaa_mode = TRUE
WHERE business_type IN (
    'medical_clinic',
    'dental_clinic',
    'urgent_care',
    'specialist_practice',
    'mental_health',
    'other_healthcare'
);

ALTER TABLE phone_number_mappings
    DROP CONSTRAINT IF EXISTS phone_number_mappings_provider_check;

UPDATE phone_number_mappings
SET provider = 'vapi',
    label = COALESCE(label, 'Vapi clinic reception line')
WHERE provider <> 'vapi';

DELETE FROM phone_number_mappings
WHERE phone_number LIKE '+placeholder_%';

ALTER TABLE phone_number_mappings
    ALTER COLUMN provider SET DEFAULT 'vapi',
    ADD CONSTRAINT phone_number_mappings_provider_check CHECK (provider IN ('vapi'));

DROP TABLE IF EXISTS phone_number_pool;

CREATE TABLE IF NOT EXISTS pricing_plans (
    id                       TEXT        PRIMARY KEY,
    name                     TEXT        NOT NULL,
    business_type            TEXT        NOT NULL,
    price_cents              INTEGER     NOT NULL CHECK (price_cents > 0),
    currency                 TEXT        NOT NULL DEFAULT 'USD',
    interval                 TEXT        NOT NULL DEFAULT 'month',
    included_vapi_numbers    INTEGER     NOT NULL DEFAULT 1,
    included_voice_minutes   INTEGER     NOT NULL DEFAULT 500,
    is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pricing_plans_updated_at
    BEFORE UPDATE ON pricing_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO pricing_plans (
    id,
    name,
    business_type,
    price_cents,
    currency,
    interval,
    included_vapi_numbers,
    included_voice_minutes
) VALUES (
    'medical_clinic_monthly',
    'Medical Clinic',
    'medical_clinic',
    30000,
    'USD',
    'month',
    1,
    500
) ON CONFLICT (id) DO UPDATE SET
    price_cents = EXCLUDED.price_cents,
    included_vapi_numbers = EXCLUDED.included_vapi_numbers,
    included_voice_minutes = EXCLUDED.included_voice_minutes,
    is_active = TRUE;

CREATE TABLE IF NOT EXISTS business_subscriptions (
    business_id                  UUID        PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id                      TEXT        NOT NULL REFERENCES pricing_plans(id),
    provider                     TEXT        NOT NULL DEFAULT 'lemonsqueezy',
    status                       TEXT        NOT NULL DEFAULT 'pending',
    provider_checkout_id         TEXT,
    provider_subscription_id     TEXT,
    provider_customer_id         TEXT,
    renews_at                    TIMESTAMPTZ,
    ends_at                      TIMESTAMPTZ,
    raw_event_type               TEXT,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER business_subscriptions_updated_at
    BEFORE UPDATE ON business_subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS billing_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          UUID        REFERENCES businesses(id) ON DELETE CASCADE,
    provider             TEXT        NOT NULL DEFAULT 'lemonsqueezy',
    event_name           TEXT        NOT NULL,
    provider_event_id    TEXT,
    payload              JSONB       NOT NULL DEFAULT '{}'::JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_business_id
    ON billing_events (business_id);

CREATE TABLE IF NOT EXISTS ai_receptionist_settings (
    business_id                      UUID        PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    greeting                         TEXT        NOT NULL DEFAULT 'Thank you for calling. How may I help you today?',
    tone                             TEXT        NOT NULL DEFAULT 'warm, calm, and professional',
    appointment_duration_minutes     INTEGER     NOT NULL DEFAULT 30 CHECK (appointment_duration_minutes > 0),
    appointment_buffer_minutes       INTEGER     NOT NULL DEFAULT 0 CHECK (appointment_buffer_minutes >= 0),
    transfer_phone                   TEXT        NOT NULL DEFAULT '',
    emergency_escalation_text        TEXT        NOT NULL DEFAULT 'If this is a medical emergency, please hang up and call 911.',
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER ai_receptionist_settings_updated_at
    BEFORE UPDATE ON ai_receptionist_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS vapi_phone_numbers (
    business_id              UUID        PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    vapi_assistant_id         TEXT        NOT NULL,
    vapi_phone_number_id      TEXT,
    phone_number              TEXT,
    area_code                 TEXT,
    status                    TEXT        NOT NULL DEFAULT 'provisioning',
    vapi_tool_ids             JSONB       NOT NULL DEFAULT '[]'::JSONB,
    hipaa_enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
    last_error                TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vapi_phone_numbers_assistant_id
    ON vapi_phone_numbers (vapi_assistant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vapi_phone_numbers_phone_id
    ON vapi_phone_numbers (vapi_phone_number_id)
    WHERE vapi_phone_number_id IS NOT NULL;

CREATE TRIGGER vapi_phone_numbers_updated_at
    BEFORE UPDATE ON vapi_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS voice_usage_periods (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    period_start         DATE        NOT NULL,
    period_end           DATE        NOT NULL,
    included_minutes     INTEGER     NOT NULL DEFAULT 500,
    used_seconds         INTEGER     NOT NULL DEFAULT 0,
    warning_sent_at      TIMESTAMPTZ,
    capped_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, period_start)
);

CREATE TRIGGER voice_usage_periods_updated_at
    BEFORE UPDATE ON voice_usage_periods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS appointment_audit_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id       INTEGER     REFERENCES appointments(id) ON DELETE SET NULL,
    event_type           TEXT        NOT NULL,
    source               TEXT        NOT NULL,
    actor_id             UUID,
    provider_call_id     TEXT,
    metadata             JSONB       NOT NULL DEFAULT '{}'::JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_events_business_id
    ON appointment_audit_events (business_id, created_at DESC);

ALTER TABLE pricing_plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_receptionist_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapi_phone_numbers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage_periods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_audit_events   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_plans: public select active"
    ON pricing_plans FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "business_subscriptions: members select"
    ON business_subscriptions FOR SELECT
    USING (auth_is_member_of(business_id));

CREATE POLICY "business_subscriptions: owner/admin manage"
    ON business_subscriptions FOR ALL
    USING (auth_is_owner_or_admin(business_id))
    WITH CHECK (auth_is_owner_or_admin(business_id));

CREATE POLICY "billing_events: owner/admin select"
    ON billing_events FOR SELECT
    USING (auth_is_owner_or_admin(business_id));

CREATE POLICY "ai_receptionist_settings: members select"
    ON ai_receptionist_settings FOR SELECT
    USING (auth_is_member_of(business_id));

CREATE POLICY "ai_receptionist_settings: owner/admin manage"
    ON ai_receptionist_settings FOR ALL
    USING (auth_is_owner_or_admin(business_id))
    WITH CHECK (auth_is_owner_or_admin(business_id));

CREATE POLICY "vapi_phone_numbers: members select"
    ON vapi_phone_numbers FOR SELECT
    USING (auth_is_member_of(business_id));

CREATE POLICY "vapi_phone_numbers: owner/admin manage"
    ON vapi_phone_numbers FOR ALL
    USING (auth_is_owner_or_admin(business_id))
    WITH CHECK (auth_is_owner_or_admin(business_id));

CREATE POLICY "voice_usage_periods: members select"
    ON voice_usage_periods FOR SELECT
    USING (auth_is_member_of(business_id));

CREATE POLICY "appointment_audit_events: members select"
    ON appointment_audit_events FOR SELECT
    USING (auth_is_member_of(business_id));
