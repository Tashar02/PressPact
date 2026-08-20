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

-- 6. User Profiles Table (Linked to Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('press_owner', 'publisher')),
    full_name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_business_name TEXT;
    user_phone TEXT;
    user_location TEXT;
BEGIN
    -- Pin the search path so the DEFINER role can never be redirected into a
    -- hostile schema owned by an attacker.
    SET search_path = public, pg_temp;
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'publisher');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'fullName', NEW.raw_user_meta_data->>'full_name', 'User');
    user_business_name := COALESCE(NEW.raw_user_meta_data->>'businessName', NEW.raw_user_meta_data->>'business_name', 'Independent Business');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    user_location := COALESCE(NEW.raw_user_meta_data->>'shopLocation', NEW.raw_user_meta_data->>'location', 'Dhaka, Bangladesh');

    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, role, full_name, business_name, phone, location)
    VALUES (NEW.id, NEW.email, user_role, user_full_name, user_business_name, user_phone, user_location)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        business_name = EXCLUDED.business_name,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location;

    -- If publisher, also ensure record in publishers table
    IF user_role = 'publisher' THEN
        INSERT INTO public.publishers (id, name, contact_person, phone, email, location, total_orders, outstanding_balance_bdt, oldest_overdue_days, credit_hold_status)
        VALUES (
            NEW.id::text,
            user_business_name,
            user_full_name,
            user_phone,
            NEW.email,
            user_location,
            0,
            0.00,
            0,
            FALSE
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute handle_new_user on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create performance indexes for frequent query paths
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_publisher_id ON job_orders(publisher_id);
CREATE INDEX IF NOT EXISTS idx_proof_logs_job_id ON proof_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(unread);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Helper function to atomically increment a publisher's total_orders count
CREATE OR REPLACE FUNCTION increment_publisher_orders(pub_id TEXT)
RETURNS VOID AS $$
BEGIN
  SET search_path = public, pg_temp;
  UPDATE publishers
  SET total_orders = total_orders + 1
  WHERE id = pub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically deduct film meters from stock for a film type, never going below
-- zero. Returns the updated available meters, or raises if the type is unknown.
CREATE OR REPLACE FUNCTION public.deduct_film_stock(p_type TEXT, p_meters NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_new_meters NUMERIC;
BEGIN
  SET search_path = public, pg_temp;
  UPDATE public.film_stock
  SET available_meters = GREATEST(0, available_meters - p_meters)
  WHERE type = p_type
  RETURNING available_meters INTO v_new_meters;

  IF v_new_meters IS NULL THEN
    RAISE EXCEPTION 'Unknown film type: %', p_type;
  END IF;

  RETURN v_new_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business rule: a job may only enter "In Production" once the publisher has
-- an approved proof on record (FR-1.2).
CREATE OR REPLACE FUNCTION public.enforce_production_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'In Production' AND OLD.status IS DISTINCT FROM 'In Production' THEN
    IF NOT EXISTS (SELECT 1 FROM public.proof_logs WHERE job_id = NEW.id AND action = 'approved') THEN
      RAISE EXCEPTION 'Cannot start production: no approved proof on record';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_production_approval ON job_orders;
CREATE TRIGGER trg_enforce_production_approval
  BEFORE UPDATE OF status ON job_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_production_approval();

-- Business rule: an invoice may only be issued on verified yield math (FR-2.2).
CREATE OR REPLACE FUNCTION public.enforce_invoice_math()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Invoiced' THEN
    IF NEW.total_intake IS NULL OR NEW.good_output IS NULL OR NEW.waste_count IS NULL THEN
      RAISE EXCEPTION 'Cannot invoice: yield and waste figures not recorded';
    END IF;
    IF NEW.good_output + NEW.waste_count <> NEW.total_intake THEN
      RAISE EXCEPTION 'Cannot invoice: good output plus waste does not equal total intake';
    END IF;
    IF NEW.yield_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'Cannot invoice: yield math not verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_invoice_math ON job_orders;
CREATE TRIGGER trg_enforce_invoice_math
  BEFORE UPDATE OF status ON job_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_math();

-- Business rule: a job's lifecycle is strictly forward-moving once it enters
-- production. Nothing may regress back to proof/order stages after the run
-- starts, and completed jobs are terminal.
CREATE OR REPLACE FUNCTION public.enforce_no_status_regression()
RETURNS TRIGGER AS $$
DECLARE
  v_old_rank INT;
  v_new_rank INT;
BEGIN
  v_old_rank := CASE OLD.status
    WHEN 'Order Placed' THEN 0
    WHEN 'Awaiting Proof' THEN 1
    WHEN 'Proof Rejected' THEN 1
    WHEN 'In Production' THEN 2
    WHEN 'Yield Audit Pending' THEN 3
    WHEN 'Invoiced' THEN 4
    WHEN 'Completed' THEN 5
    ELSE 0
  END;
  v_new_rank := CASE NEW.status
    WHEN 'Order Placed' THEN 0
    WHEN 'Awaiting Proof' THEN 1
    WHEN 'Proof Rejected' THEN 1
    WHEN 'In Production' THEN 2
    WHEN 'Yield Audit Pending' THEN 3
    WHEN 'Invoiced' THEN 4
    WHEN 'Completed' THEN 5
    ELSE 0
  END;

  IF v_new_rank < v_old_rank THEN
    RAISE EXCEPTION 'Cannot move job from % back to %: lifecycle status only moves forward', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_no_status_regression ON job_orders;
CREATE TRIGGER trg_enforce_no_status_regression
  BEFORE UPDATE OF status ON job_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_no_status_regression();

-- Business rule: once a job is invoiced, its audited yield figures become
-- part of the permanent record and may not be edited.
CREATE OR REPLACE FUNCTION public.enforce_yield_immutable_after_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('Invoiced', 'Completed') THEN
    RAISE EXCEPTION 'Cannot edit yield figures: job is already invoiced';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_yield_immutable_after_invoice ON job_orders;
CREATE TRIGGER trg_enforce_yield_immutable_after_invoice
  BEFORE UPDATE OF total_intake, good_output, waste_count, yield_verified ON job_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_yield_immutable_after_invoice();

