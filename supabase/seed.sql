-- PressPact Initial Seed Data

-- 1. Insert Initial Publisher
INSERT INTO publishers (
    id, name, contact_person, phone, email, location, total_orders, outstanding_balance_bdt, oldest_overdue_days, credit_hold_status
) VALUES (
    'pub-1',
    'Sagorica Publications',
    'Shahin Ahmed Mithu',
    '+880 1711-456789',
    'orders@sagorikabooks.bd',
    'Banglabazar, Dhaka',
    14,
    76500.00,
    33,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Initial Film Stock
INSERT INTO film_stock (id, type, available_meters, roll_width_cm, min_threshold_meters, last_restocked) VALUES
('stk-1', 'Matte 30μm', 4500.00, 72.00, 1000.00, '2026-07-15'),
('stk-2', 'Gloss 24μm', 800.00, 72.00, 1500.00, '2026-07-02'),
('stk-3', 'Velvet Touch', 2200.00, 65.00, 800.00, '2026-07-10'),
('stk-4', 'Thermal Matte', 3100.00, 70.00, 1000.00, '2026-07-12')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Initial Job Orders
INSERT INTO job_orders (
    id, book_title, publisher_id, publisher_name, press_name, press_owner_name,
    covers_count, lamination_type, due_date, order_date, status, estimated_film_meters,
    proof_photo_url, proof_note, total_intake, good_output, waste_count, yield_verified,
    invoice_id, amount_bdt, invoice_due_date, payment_status, days_overdue
) VALUES (
    '#ORD-009',
    'বিদ্যাকোষ-বাংলা ভাষার ব্যাকরণ ও নির্মিতি - অষ্টম শ্রেণি',
    'pub-1',
    'Sagorica Publications',
    'Nova Lamination',
    'Md. Abdur Rahim',
    2000,
    'Matte 30μm',
    'Aug 10, 2026',
    'Jul 20, 2026',
    'Awaiting Proof',
    1400.00,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLiqouJrqFAiLNs5KclUB0rxj6KsoCM8ojeEjqps_Fg&s=10',
    'Applied Matte finish sample run (2 test covers). Please verify edge pasting & color depth.',
    2000, 1950, 50, TRUE,
    'INV-2026-009', 45000.00, '2026-06-18', 'Overdue', 33
), (
    '#ORD-008',
    'A self-learning For Writing Test 1st and 2nd Paper',
    'pub-1',
    'Sagorica Publications',
    'Nova Lamination',
    'Md. Abdur Rahim',
    1500,
    'Gloss 24μm',
    'Aug 05, 2026',
    'Jul 15, 2026',
    'In Production',
    1050.00,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLiqouJrqFAiLNs5KclUB0rxj6KsoCM8ojeEjqps_Fg&s=10',
    'Gloss 24μm sample approved by publisher.',
    1500, 1470, 30, TRUE,
    'INV-2026-008', 31500.00, '2026-08-16', 'Unpaid', 0
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert Initial Proof Logs
INSERT INTO proof_logs (job_id, timestamp, action, actor, role, note, photo_url) VALUES
('#ORD-009', '2026-07-21 14:30:00+06', 'uploaded', 'Md. Abdur Rahim (Nova Lamination)', 'press_owner', 'Uploaded sample proof photo for 2 test covers.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLiqouJrqFAiLNs5KclUB0rxj6KsoCM8ojeEjqps_Fg&s=10'),
('#ORD-008', '2026-07-16 10:15:00+06', 'uploaded', 'Md. Abdur Rahim', 'press_owner', 'Uploaded Gloss test sample.', NULL),
('#ORD-008', '2026-07-16 11:45:00+06', 'approved', 'Shahin Ahmed Mithu', 'publisher', 'Approved for full production run.', NULL);

-- 5. Insert Initial Notifications
INSERT INTO notifications (timestamp, title, message, type, unread, job_id) VALUES
(NOW() - INTERVAL '10 minutes', 'Proof Uploaded', 'Nova Lamination uploaded a test proof.', 'proof', TRUE, '#ORD-009'),
(NOW() - INTERVAL '1 hour', 'Low Stock Alert', 'Gloss 24μm film stock (800m) is below minimum threshold (1500m).', 'stock', TRUE, NULL),
(NOW() - INTERVAL '1 day', 'Credit Hold Triggered', 'Sagorica Publications account placed on automated credit hold (33 days overdue).', 'credit', FALSE, NULL);
