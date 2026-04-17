-- 012_fix_callers_unique_constraint.sql
-- Phase C: Handle NULL business_id during transition.
--
-- The UNIQUE (business_id, phone_number) constraint allows multiple rows
-- with (NULL, phone) because SQL treats NULL != NULL. During Phase C,
-- business_id IS NULL, so we need a partial unique index.
--
-- After Phase C backfills business_id NOT NULL, this index is not needed
-- but doesn't hurt (the constraint will enforce the rule).

DROP CONSTRAINT IF EXISTS callers_business_phone_unique ON callers;

CREATE UNIQUE INDEX callers_phone_null_business_idx
    ON callers (phone_number)
    WHERE business_id IS NULL;

CREATE UNIQUE INDEX callers_phone_business_idx
    ON callers (business_id, phone_number)
    WHERE business_id IS NOT NULL;
