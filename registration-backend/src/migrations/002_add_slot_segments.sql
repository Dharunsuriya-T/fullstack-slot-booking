-- Adds optional slot segmentation by student category.
-- Backwards-compatible: columns are nullable.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS residence_type TEXT;

ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS residence_type TEXT;

-- Helpful index for filtering slots by segment
CREATE INDEX IF NOT EXISTS idx_slots_form_segment
  ON slots (form_id, residence_type, gender);
