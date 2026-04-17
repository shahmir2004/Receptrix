-- Migration 015: Enforce NOT NULL on business_id for legacy tables
--
-- Run AFTER migrate_sqlite_to_supabase.py has assigned a business_id to every
-- existing row.  Aborts if any NULL remains so you can re-run the script first.
--
-- Tables affected: callers, appointments, call_logs
-- (bookings is a purely legacy table with no business scoping — left unchanged)

DO $$
DECLARE
  null_callers       INT;
  null_appointments  INT;
  null_call_logs     INT;
BEGIN
  SELECT COUNT(*) INTO null_callers      FROM callers      WHERE business_id IS NULL;
  SELECT COUNT(*) INTO null_appointments FROM appointments WHERE business_id IS NULL;
  SELECT COUNT(*) INTO null_call_logs    FROM call_logs    WHERE business_id IS NULL;

  IF null_callers > 0 OR null_appointments > 0 OR null_call_logs > 0 THEN
    RAISE EXCEPTION
      'NULL business_id rows remain: callers=%, appointments=%, call_logs=%. '
      'Run migrate_sqlite_to_supabase.py first.',
      null_callers, null_appointments, null_call_logs;
  END IF;
END $$;

-- Safe to set NOT NULL now
ALTER TABLE callers      ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE call_logs    ALTER COLUMN business_id SET NOT NULL;

-- Drop the partial unique index on callers (used for NULL business_id single-tenant mode)
-- and replace with a regular composite unique index now that business_id is always set.
DROP INDEX IF EXISTS callers_phone_null_business_unique;

ALTER TABLE callers
  ADD CONSTRAINT callers_phone_business_unique UNIQUE (phone_number, business_id);
