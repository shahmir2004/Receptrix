-- 013_create_phone_number_mappings.sql
-- Phase D: Maps provider phone numbers (Twilio/SignalWire) to businesses.
-- When a call arrives on a provider number, we look up which business owns it.

CREATE TABLE IF NOT EXISTS phone_number_mappings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number TEXT       NOT NULL UNIQUE,  -- the Twilio/SignalWire number in E.164
    provider    TEXT        NOT NULL DEFAULT 'signalwire'
                            CHECK (provider IN ('twilio', 'signalwire')),
    label       TEXT,                         -- optional friendly name
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_number_mappings_business_id
    ON phone_number_mappings (business_id);

CREATE TRIGGER phone_number_mappings_updated_at
    BEFORE UPDATE ON phone_number_mappings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE phone_number_mappings ENABLE ROW LEVEL SECURITY;

-- Policies: members can see their business phone numbers, owner/admin can manage
CREATE POLICY "Members can view own business phone numbers"
    ON phone_number_mappings FOR SELECT
    USING (auth_is_member_of(business_id));

CREATE POLICY "Owner/admin can manage phone numbers"
    ON phone_number_mappings FOR ALL
    USING (auth_is_owner_or_admin(business_id))
    WITH CHECK (auth_is_owner_or_admin(business_id));

-- Seed: map the demo business's SignalWire number
INSERT INTO phone_number_mappings (business_id, phone_number, provider, label)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+placeholder_signalwire',
    'signalwire',
    'Main reception line'
) ON CONFLICT (phone_number) DO NOTHING;
