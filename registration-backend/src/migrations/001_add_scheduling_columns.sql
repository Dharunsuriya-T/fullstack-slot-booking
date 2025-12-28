-- Add scheduling columns to forms table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE forms 
ADD COLUMN scheduled_publish_at TIMESTAMP,
ADD COLUMN scheduled_close_at TIMESTAMP,
ADD COLUMN auto_open BOOLEAN DEFAULT false,
ADD COLUMN auto_close BOOLEAN DEFAULT false;

-- Add index for scheduling queries
CREATE INDEX idx_forms_scheduling ON forms(scheduled_publish_at, scheduled_close_at, status);
