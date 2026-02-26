-- Optional: Add is_individual to clients for tracking individual (no company name) signups.
-- Safe to run on existing DBs; column defaults to FALSE.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_individual BOOLEAN DEFAULT FALSE;
