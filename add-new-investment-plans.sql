-- ===============================================
-- Add New Investment Plans ($50, $100, $500)
-- ===============================================

-- Insert new affordable investment plans
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
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
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
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
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
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    '["ASIC S19 Mining", "Priority Support", "Advanced Analytics", "Auto-compound Option"]',
    'Medium',
    'ASIC S19',
    '95 TH/s',
    '3250W',
    true
);

-- Verify new plans
SELECT 
    name,
    min_amount,
    max_amount,
    roi_daily_percent,
    duration_days,
    mining_type,
    hash_rate
FROM plans 
WHERE min_amount IN (50, 100, 500) AND max_amount IN (50, 100, 500)
ORDER BY min_amount;
