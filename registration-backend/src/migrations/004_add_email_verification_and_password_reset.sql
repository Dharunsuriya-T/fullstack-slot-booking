-- Adds email verification + password reset support for local auth.
-- Backwards-compatible: existing rows default to email_verified = TRUE for safety.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;

UPDATE students
SET email_verified = TRUE
WHERE email_verified IS NULL;

ALTER TABLE students
  ALTER COLUMN email_verified SET DEFAULT FALSE;

ALTER TABLE students
  ALTER COLUMN email_verified SET NOT NULL;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_email_verification_token_hash
  ON students (email_verification_token_hash);

CREATE INDEX IF NOT EXISTS idx_students_password_reset_token_hash
  ON students (password_reset_token_hash);
