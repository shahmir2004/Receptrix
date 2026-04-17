-- 012_callers_null_business_unique_phone.sql
-- Phase C safety net: ensure phone_number uniqueness when business_id IS NULL.
-- PostgreSQL's UNIQUE(business_id, phone_number) treats NULLs as distinct,
-- so without this index two callers with the same phone and NULL business_id
-- could coexist — breaking the get_or_create_caller SELECT-then-INSERT logic.

CREATE UNIQUE INDEX IF NOT EXISTS callers_phone_null_business
    ON callers (phone_number)
    WHERE business_id IS NULL;
