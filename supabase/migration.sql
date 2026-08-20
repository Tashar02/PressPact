-- PressPact Live Database Migration (Batch 3)
-- Adds cover supply flow, multi-proof upload, payment screenshot, and
-- the business log ledger to an existing PressPact database.
-- Safe to run; every statement is idempotent (IF NOT EXISTS / IF EXISTS).
-- Apply BEFORE using the new build so queries against the new columns work.

-- 1. New job_orders columns
ALTER TABLE job_orders
    ADD COLUMN IF NOT EXISTS payment_note_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS proof_photos TEXT[],
    ADD COLUMN IF NOT EXISTS cover_supply TEXT CHECK (cover_supply IN ('client_supplied', 'press_purchased')),
    ADD COLUMN IF NOT EXISTS cover_type TEXT,
    ADD COLUMN IF NOT EXISTS cover_status TEXT CHECK (cover_status IN ('requested', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS cover_request_price_bdt NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS cover_price_bdt NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Cover Types table (per-press paper stock the press can supply)
CREATE TABLE IF NOT EXISTS cover_types (
    id TEXT PRIMARY KEY,
    press_name TEXT NOT NULL,
    name TEXT NOT NULL,
    price_bdt NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (press_name, name)
);
CREATE INDEX IF NOT EXISTS idx_cover_types_press ON cover_types(press_name);
CREATE INDEX IF NOT EXISTS idx_job_orders_created_at ON job_orders(created_at DESC);

-- 3. Business Logs table (immutable ledger: every business action is recorded)
CREATE TABLE IF NOT EXISTS business_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id TEXT NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('press_owner', 'publisher')),
    action TEXT NOT NULL,
    note TEXT
);
CREATE INDEX IF NOT EXISTS idx_business_logs_job_id ON business_logs(job_id);

-- 4. Allow 'cover' notification type (replaces the old check constraint)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('proof', 'yield', 'credit', 'stock', 'order', 'cover'));

-- 5. Remove the legacy demo orders so ids start clean at #ORD-00000001
-- (proof_logs and business_logs cascade; notifications have no FK so
--  they are removed explicitly)
DELETE FROM notifications
WHERE job_id IN ('#ORD-00000008', '#ORD-00000009', '#ORD-00000010');
DELETE FROM job_orders
WHERE id IN ('#ORD-00000008', '#ORD-00000009', '#ORD-00000010');

-- 6. Re-run the seed (supabase/seed.sql) to insert the fresh demo rows,
--    cover types, business logs, proof logs, and notifications.
--    Run seed.sql in the SQL editor AFTER applying this file.