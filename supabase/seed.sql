-- PressPact Initial Seed Data
--
-- NOTE ON PILOT DATA: 'pub-1' is a fixed business key, NOT an auth user id.
-- When the pilot publisher signs up through the app, the handle_new_user
-- trigger creates a SECOND publishers row keyed by their auth UUID. The two
-- rows are intentionally not merged by the seed so the demo can run before
-- auth exists; a production rollout should either reuse the auth id here or
-- reconcile the duplicate row once.

-- 1. Insert Initial Publisher
INSERT INTO publishers (
    id, name, contact_person, phone, email, location, total_orders, outstanding_balance_bdt, oldest_overdue_days, credit_hold_status
) VALUES (
    'pub-1',
    'Sagorica Publications',
    'Dummy Publisher',
    '+880 1800-000002',
    'dummy.publisher@example.com',
    'Motijheel, Dhaka',
    14,
    76500.00,
    33,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Initial Film Stock
-- Stock is owned per press; everything below belongs to the demo press
-- 'Green Print Lamination'. per_cover_price_bdt feeds the auto invoice
-- amount in the yield validator (good_output x price).
INSERT INTO film_stock (id, press_name, type, available_meters, roll_width_cm, min_threshold_meters, per_cover_price_bdt, last_restocked) VALUES
('stk-1', 'Green Print Lamination', 'Matte 30μm', 4500.00, 72.00, 1000.00, 25.00, '2026-07-15'),
('stk-2', 'Green Print Lamination', 'Gloss 24μm', 800.00, 72.00, 1500.00, 20.00, '2026-07-02'),
('stk-3', 'Green Print Lamination', 'Velvet Touch', 2200.00, 65.00, 800.00, 32.00, '2026-07-10'),
('stk-4', 'Green Print Lamination', 'Thermal Matte', 3100.00, 70.00, 1000.00, 28.00, '2026-07-12')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Initial Job Orders
-- Rows use the app's 8-digit sequential id format (#ORD-00000001...) so the
-- demo follows the exact same "max id + 1" counter a real order would use.
-- Rows are internally consistent with the DB triggers: an invoiced job carries
-- verified yield figures and a matching invoice amount (good_output x
-- per-cover price), while a job still in production carries none.
INSERT INTO job_orders (
    id, book_title, publisher_id, publisher_name, press_name, press_owner_name,
    covers_count, lamination_type, due_date, order_date, status, estimated_film_meters,
    proof_photo_url, proof_note, total_intake, good_output, waste_count, yield_verified,
    invoice_id, amount_bdt, invoice_due_date, payment_status, days_overdue,
    cover_supply, cover_type, cover_status, cover_price_bdt, created_at
) VALUES (
    '#ORD-00000001',
    'বিদ্যাকোষ-বাংলা ভাষার ব্যাকরণ ও নির্মিতি - অষ্টম শ্রেণি',
    'pub-1',
    'Sagorica Publications',
    'Green Print Lamination',
    'Dummy Press Owner',
    2000,
    'Matte 30μm',
    'Aug 10, 2026',
    'Jul 20, 2026',
    'Invoiced',
    1400.00,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLiqouJrqFAiLNs5KclUB0rxj6KsoCM8ojeEjqps_Fg&s=10',
    'Applied Matte finish sample run (2 test covers). Please verify edge pasting & color depth.',
    2000, 1950, 50, TRUE,
    'INV-2026-00000001', 48750.00, '2026-06-18', 'Overdue', 33,
    'client_supplied', NULL, NULL, NULL,
    '2026-07-20 11:00:00+06'
), (
    '#ORD-00000002',
    'A self-learning For Writing Test 1st and 2nd Paper',
    'pub-1',
    'Sagorica Publications',
    'Green Print Lamination',
    'Dummy Press Owner',
    1500,
    'Gloss 24μm',
    'Aug 05, 2026',
    'Jul 15, 2026',
    'In Production',
    1050.00,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLiqouJrqFAiLNs5KclUB0rxj6KsoCM8ojeEjqps_Fg&s=10',
    'Gloss 24μm sample approved by publisher.',
    NULL, NULL, NULL, FALSE,
    NULL, NULL, NULL, NULL, 0,
    'client_supplied', NULL, NULL, NULL,
    '2026-07-15 10:00:00+06'
) ON CONFLICT (id) DO NOTHING;

-- 3b. Insert Initial Cover Types (per-press paper stock the press can supply)
INSERT INTO cover_types (id, press_name, name, price_bdt, description) VALUES
('cvr-1', 'Green Print Lamination', 'Art Card 300gsm', 8.00, 'Standard matte art card, single-sided coated.'),
('cvr-2', 'Green Print Lamination', 'Art Card 350gsm', 9.50, 'Heavier art card for premium book covers.')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Initial Proof Logs
INSERT INTO proof_logs (job_id, timestamp, action, actor, role, note, photo_url) VALUES
('#ORD-00000001', '2026-07-21 14:30:00+06', 'uploaded', 'Dummy Press Owner (Green Print Lamination)', 'press_owner', 'Uploaded sample proof photo for 2 test covers.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLiqouJrqFAiLNs5KclUB0rxj6KsoCM8ojeEjqps_Fg&s=10'),
('#ORD-00000001', '2026-07-22 09:10:00+06', 'approved', 'Dummy Publisher', 'publisher', 'Approved proof; proceed with full Matte run.', NULL),
('#ORD-00000002', '2026-07-16 10:15:00+06', 'uploaded', 'Dummy Press Owner', 'press_owner', 'Uploaded Gloss test sample.', NULL),
('#ORD-00000002', '2026-07-16 11:45:00+06', 'approved', 'Dummy Publisher', 'publisher', 'Approved for full production run.', NULL);

-- 4b. Insert Initial Business Logs (binding audit trail)
INSERT INTO business_logs (job_id, timestamp, actor, role, action, note) VALUES
('#ORD-00000001', '2026-07-20 11:00:00+06', 'Dummy Publisher', 'publisher', 'order_placed', 'Order placed with covers supplied by the client (client_supplied).'),
('#ORD-00000001', '2026-06-18 15:00:00+06', 'Dummy Press Owner', 'press_owner', 'invoice_issued', 'Invoice INV-2026-00000001 issued for BDT 48,750.');

-- 5. Insert Initial Notifications
INSERT INTO notifications (timestamp, title, message, type, unread, job_id) VALUES
(NOW() - INTERVAL '10 minutes', 'Proof Uploaded', 'Green Print Lamination uploaded a test proof.', 'proof', TRUE, '#ORD-00000001'),
(NOW() - INTERVAL '1 hour', 'Low Stock Alert', 'Green Print Lamination Gloss 24μm film stock (800m) is below minimum threshold (1500m).', 'stock', TRUE, NULL),
(NOW() - INTERVAL '1 day', 'Credit Hold Triggered', 'Sagorica Publications account placed on automated credit hold (33 days overdue).', 'credit', FALSE, NULL);