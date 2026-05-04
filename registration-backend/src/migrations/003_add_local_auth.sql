-- Adds local email/password authentication support.
-- Backwards-compatible: Google OAuth users will have password_hash NULL.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_students_email_lower
  ON students (LOWER(email));
