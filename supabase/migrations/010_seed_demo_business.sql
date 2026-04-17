-- 010_seed_demo_business.sql
-- Minimal bootstrap seed: one business, one owner profile, three services.
-- Values taken directly from business_config.json.
-- This seed is IDEMPOTENT: safe to run multiple times (ON CONFLICT DO NOTHING on all inserts).
--
-- IMPORTANT: Before running this seed:
--   1. Create the owner user in Supabase Auth (dashboard or `supabase auth admin create-user`)
--   2. Copy the returned user UUID and replace the v_owner_id value below
--   3. Replace business details with real values for production

DO $$
DECLARE
    v_business_id   UUID := '00000000-0000-0000-0000-000000000001';
    v_owner_id      UUID := '00000000-0000-0000-0000-000000000002';  -- REPLACE with real auth.users.id
BEGIN

    -- ── 1. Insert the demo business ─────────────────────────────────────────
    INSERT INTO businesses (
        id,
        name,
        phone,
        email,
        address,
        timezone,
        greeting_message,
        working_hours
    )
    VALUES (
        v_business_id,
        'Your Business Name',
        '+92 3095218142',
        'info@yourbusiness.pk',
        'Your Business Address, City, Pakistan',
        'Asia/Karachi',
        'Thank you for calling. How may I assist you today?',
        '{
            "monday":    "9:00 AM - 6:00 PM",
            "tuesday":   "9:00 AM - 6:00 PM",
            "wednesday": "9:00 AM - 6:00 PM",
            "thursday":  "9:00 AM - 6:00 PM",
            "friday":    "9:00 AM - 6:00 PM",
            "saturday":  "10:00 AM - 4:00 PM",
            "sunday":    "Closed"
        }'::JSONB
    )
    ON CONFLICT (id) DO NOTHING;

    -- ── 2. Insert the owner profile ──────────────────────────────────────────
    -- NOTE: v_owner_id MUST exist in auth.users before this runs.
    INSERT INTO profiles (id, email, full_name)
    VALUES (v_owner_id, 'owner@yourbusiness.pk', 'Business Owner')
    ON CONFLICT (id) DO NOTHING;

    -- ── 3. Assign owner role to the business ────────────────────────────────
    INSERT INTO business_memberships (user_id, business_id, role)
    VALUES (v_owner_id, v_business_id, 'owner')
    ON CONFLICT (user_id, business_id) DO NOTHING;

    -- ── 4. Insert the three default services ────────────────────────────────
    INSERT INTO services (business_id, name, price, duration, description)
    VALUES
        (v_business_id, 'Consultation',     2000.00, 30, 'Initial consultation session'),
        (v_business_id, 'Standard Service', 5000.00, 60, 'Standard service package'),
        (v_business_id, 'Premium Service',  10000.00,90, 'Premium full service package')
    ON CONFLICT (business_id, name) DO NOTHING;

END $$;
