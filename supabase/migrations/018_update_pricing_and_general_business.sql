-- 018_update_pricing_and_general_business.sql
-- Refresh public plan pricing and allow general businesses during onboarding.

ALTER TABLE businesses
    DROP CONSTRAINT IF EXISTS businesses_business_type_check;

ALTER TABLE businesses
    ADD CONSTRAINT businesses_business_type_check CHECK (business_type IN (
        'medical_clinic',
        'dental_clinic',
        'urgent_care',
        'specialist_practice',
        'mental_health',
        'other_healthcare',
        'general_business'
    ));

INSERT INTO pricing_plans (
    id,
    name,
    business_type,
    price_cents,
    currency,
    interval,
    included_vapi_numbers,
    included_voice_minutes
) VALUES
    (
        'medical_clinic_monthly',
        'Medical Clinic',
        'medical_clinic',
        29999,
        'USD',
        'month',
        1,
        500
    ),
    (
        'general_business_monthly',
        'General Business',
        'general_business',
        19999,
        'USD',
        'month',
        1,
        500
    )
ON CONFLICT (id) DO UPDATE SET
    price_cents = EXCLUDED.price_cents,
    included_vapi_numbers = EXCLUDED.included_vapi_numbers,
    included_voice_minutes = EXCLUDED.included_voice_minutes,
    is_active = TRUE,
    updated_at = NOW();
