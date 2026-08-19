-- PressPact PostgreSQL Schema Definition
-- Supports Job Orders, Proof Approval Audits, Yield & Waste Math Verification, and Publisher Credit Controls

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Publishers Table
CREATE TABLE IF NOT EXISTS publishers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    location TEXT NOT NULL,
    total_orders INT DEFAULT 0,
    outstanding_balance_bdt NUMERIC(12, 2) DEFAULT 0.00,
    oldest_overdue_days INT DEFAULT 0,
    credit_hold_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Film Stock Table
CREATE TABLE IF NOT EXISTS film_stock (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    available_meters NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    roll_width_cm NUMERIC(6, 2) NOT NULL,
    min_threshold_meters NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
    last_restocked DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Job Orders Table
CREATE TABLE IF NOT EXISTS job_orders (
    id TEXT PRIMARY KEY,
    book_title TEXT NOT NULL,
    publisher_id TEXT REFERENCES publishers(id) ON DELETE SET NULL,
    publisher_name TEXT NOT NULL,
    press_name TEXT NOT NULL DEFAULT 'Nova Lamination',
    press_owner_name TEXT DEFAULT 'Md. Abdur Rahim',
    covers_count INT NOT NULL CHECK (covers_count > 0),
    lamination_type TEXT NOT NULL,
    due_date TEXT NOT NULL,
    order_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN (
            'Order Placed',
            'Awaiting Proof',
            'Proof Rejected',
            'In Production',
            'Yield Audit Pending',
            'Invoiced',
            'Completed'
        )
    ),
    estimated_film_meters NUMERIC(10, 2) NOT NULL,
    proof_photo_url TEXT,
    proof_note TEXT,
    total_intake INT,
    good_output INT,
    waste_count INT,
    yield_verified BOOLEAN DEFAULT FALSE,
    invoice_id TEXT,
    amount_bdt NUMERIC(12, 2),
    invoice_due_date TEXT,
    payment_status TEXT CHECK (payment_status IN ('Paid', 'Unpaid', 'Overdue')),
    days_overdue INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Proof Logs Table (Immutable Quality Audit Log)
CREATE TABLE IF NOT EXISTS proof_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id TEXT NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL CHECK (action IN ('uploaded', 'approved', 'rejected')),
    actor TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('press_owner', 'publisher')),
    note TEXT,
    photo_url TEXT
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('proof', 'yield', 'credit', 'stock', 'order')),
    unread BOOLEAN DEFAULT TRUE,
    job_id TEXT
);

-- Create performance indexes for frequent query paths
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_publisher_id ON job_orders(publisher_id);
CREATE INDEX IF NOT EXISTS idx_proof_logs_job_id ON proof_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(unread);
