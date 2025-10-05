-- ===============================================
-- Add Test Mining Plans for Admin Panel
-- ===============================================

-- 1. Make sure plan categories exist
INSERT INTO plan_categories (name, description, icon, color) VALUES
('bitcoin-mining', 'Bitcoin Mining Operations', 'bitcoin', '#F7931A'),
('ethereum-mining', 'Ethereum Mining Pools', 'ethereum', '#627EEA'),
('cloud-mining', 'Cloud Mining Services', 'cloud', '#4285F4')
ON CONFLICT (name) DO NOTHING;

-- 2. Add the specific plans you requested ($50, $100, $500)
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
-- $50 Plan
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
-- $100 Plan
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
-- $500 Plan
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
ON CONFLICT (name) DO UPDATE SET
    min_amount = EXCLUDED.min_amount,
    max_amount = EXCLUDED.max_amount,
    roi_daily_percent = EXCLUDED.roi_daily_percent,
    duration_days = EXCLUDED.duration_days,
    is_active = EXCLUDED.is_active;

-- 3. Verify plans were created
SELECT 
    'Mining Plans Created:' as status,
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

-- 4. Count verification
SELECT 
    COUNT(*) as total_active_plans,
    COUNT(CASE WHEN min_amount = 50 THEN 1 END) as fifty_dollar_plans,
    COUNT(CASE WHEN min_amount = 100 THEN 1 END) as hundred_dollar_plans,
    COUNT(CASE WHEN min_amount = 500 THEN 1 END) as five_hundred_dollar_plans
FROM plans 
WHERE is_active = true;
