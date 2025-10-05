-- ===============================================
-- Quick Fixes for WeEarn Mining Platform
-- ===============================================

-- 1. First run the profile creation fix
-- Run safe-profile-fix.sql first if you haven't already

-- 2. Add the new investment plans if they don't exist
INSERT INTO plans (
    name, 
    description, 
    min_amount, 
    max_amount, 
    roi_daily_percent, 
    duration_days, 
    category_id,
    features,
    risk_level,
    mining_type,
    hash_rate,
    power_consumption,
    is_active
) VALUES
-- $50 Micro Mining Plan
(
    'Micro Bitcoin Miner', 
    'Perfect starter plan for new miners. Low risk, steady returns with shared ASIC mining.',
    50, 
    50, 
    1.8, 
    20,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining' LIMIT 1),
    '["Shared ASIC Mining", "Daily Payouts", "24/7 Support", "Mobile Monitoring"]',
    'Low',
    'Shared ASIC',
    '5 TH/s',
    '150W',
    true
),
-- $100 Basic Mining Plan  
(
    'Basic Bitcoin Miner', 
    'Popular choice for beginners. Dedicated mining power with good daily returns.',
    100, 
    100, 
    2.2, 
    25,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining' LIMIT 1),
    '["Dedicated Mining", "Real-time Stats", "Daily Rewards", "Email Notifications"]',
    'Low',
    'ASIC S9',
    '14 TH/s',
    '300W',
    true
),
-- $500 Advanced Mining Plan
(
    'Advanced Bitcoin Miner', 
    'Professional mining with latest hardware. Higher returns for serious miners.',
    500, 
    500, 
    2.8, 
    30,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining' LIMIT 1),
    '["ASIC S19 Mining", "Priority Support", "Advanced Analytics", "Auto-compound Option"]',
    'Medium',
    'ASIC S19',
    '95 TH/s',
    '3250W',
    true
)
ON CONFLICT (name) DO NOTHING;

-- 3. Make sure you have admin role
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Alternative: Make the first user admin (safer option)
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
    SELECT user_id 
    FROM profiles 
    ORDER BY created_at 
    LIMIT 1
);

-- Emergency: Make ALL users admin (only for testing - remove this in production!)
-- UPDATE profiles SET role = 'admin';

-- Show current users and their roles
SELECT 
    email,
    role,
    user_id,
    created_at
FROM profiles 
ORDER BY created_at;

-- 4. Verify everything is working
SELECT 'Plans created:' as status, COUNT(*) as count FROM plans WHERE is_active = true;
SELECT 'Admin users:' as status, COUNT(*) as count FROM profiles WHERE role = 'admin';
SELECT 'Total users:' as status, COUNT(*) as count FROM profiles;

-- 5. Show the plans that were created
SELECT 
    name,
    min_amount,
    max_amount,
    roi_daily_percent,
    duration_days,
    mining_type,
    is_active
FROM plans 
WHERE is_active = true
ORDER BY min_amount;
