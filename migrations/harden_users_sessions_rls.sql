-- P0 auth hardening: these tables contain password hashes and bearer tokens.
-- Application access is server-side through the service role, so client roles
-- intentionally receive default-deny RLS with no permissive policies.

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Remove every permissive policy, including policies added outside this repo.
-- Restrictive policies cannot grant access by themselves, so the result is
-- default-deny while preserving any additional restrictive safeguards.
DO $migration$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name
    FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_class AS c
      ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace AS n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('users', 'sessions')
      AND p.polpermissive
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policy_name,
      policy_record.schema_name,
      policy_record.table_name
    );
  END LOOP;
END
$migration$;

-- Legacy SHA-256 hashes were readable through the anon API before this
-- migration and must therefore be treated as compromised. Destroy them rather
-- than allowing a first-login upgrade; affected members recover through the
-- signed, single-use password-reset flow and receive a salted scrypt hash.
UPDATE public.users
SET
  password_hash = 'reset-required$' || id::text,
  updated_at = CURRENT_TIMESTAMP
WHERE password_hash ~ '^[0-9A-Fa-f]{64}$';

-- Existing bearer tokens must not survive the RLS remediation.
TRUNCATE TABLE public.sessions;

COMMIT;
