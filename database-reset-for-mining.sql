-- ===============================================
-- WeEarn Database Reset for Bitcoin Mining System
-- ===============================================
-- WARNING: This will delete ALL existing data!
-- Run this script to start fresh with the new mining system

-- PostgreSQL version for Supabase
-- Note: PostgreSQL doesn't have foreign_key_checks like MySQL

-- ===============================================
-- 1. DELETE ALL EXISTING DATA
-- ===============================================

-- Delete all user data
DELETE FROM profiles;
DELETE FROM transactions;
DELETE FROM subscriptions;
DELETE FROM withdrawals;
DELETE FROM deposits;
DELETE FROM referrals;
DELETE FROM notifications;

-- Delete all admin data
DELETE FROM admin_users;
DELETE FROM admin_sessions;

-- Delete all plan data
DELETE FROM plans;
DELETE FROM plan_categories;

-- Reset auth users (Supabase managed)
-- Note: You'll need to manually delete users from Supabase Auth dashboard

-- ===============================================
-- 2. RESET SEQUENCES (PostgreSQL equivalent of AUTO_INCREMENT)
-- ===============================================

-- Reset sequences for tables that use serial/bigserial columns
-- Note: Only reset if the tables use sequences (most Supabase tables use UUIDs)
-- ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS withdrawals_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS deposits_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS referrals_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS plans_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS plan_categories_id_seq RESTART WITH 1;

-- ===============================================
-- 3. CREATE NEW MINING PLAN CATEGORIES
-- ===============================================

INSERT INTO plan_categories (name, description, icon, color) VALUES
('bitcoin-mining', 'Bitcoin Mining Operations', 'bitcoin', '#F7931A'),
('ethereum-mining', 'Ethereum Mining Pools', 'ethereum', '#627EEA'),
('altcoin-mining', 'Alternative Cryptocurrency Mining', 'coins', '#00D4AA'),
('cloud-mining', 'Cloud Mining Services', 'cloud', '#4285F4'),
('defi-staking', 'DeFi Staking Rewards', 'trending-up', '#9C27B0'),
('nft-mining', 'NFT Collection Mining', 'image', '#FF6B35');

-- ===============================================
-- 4. CREATE NEW BITCOIN MINING PLANS
-- ===============================================

-- Bitcoin Mining Plans
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
    active
) VALUES
-- Starter Bitcoin Mining
(
    'Bitcoin Starter Miner', 
    'Entry-level Bitcoin mining with ASIC S19 miners. Perfect for beginners wanting to start crypto mining.',
    50, 
    500, 
    2.5, 
    30,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    '["ASIC S19 Miners", "24/7 Monitoring", "Daily Payouts", "Mining Pool Access"]',
    'Low',
    'ASIC Mining',
    '95 TH/s',
    '3250W',
    true
),

-- Professional Bitcoin Mining
(
    'Bitcoin Pro Miner', 
    'Professional Bitcoin mining operation with latest S19 Pro miners and optimized cooling.',
    500, 
    2500, 
    3.2, 
    45,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    '["ASIC S19 Pro", "Advanced Cooling", "Priority Support", "Real-time Analytics", "Mining Optimization"]',
    'Medium',
    'ASIC Mining',
    '110 TH/s',
    '3050W',
    true
),

-- Enterprise Bitcoin Mining
(
    'Bitcoin Enterprise Farm', 
    'Large-scale Bitcoin mining farm with industrial-grade equipment and renewable energy.',
    2500, 
    10000, 
    4.1, 
    60,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    '["Industrial ASIC Farm", "Renewable Energy", "Dedicated Support", "Custom Mining Pool", "Advanced Analytics", "Insurance Coverage"]',
    'Medium',
    'Industrial Mining',
    '500+ TH/s',
    '15000W+',
    true
),

-- Ethereum Mining Plans
(
    'Ethereum GPU Miner', 
    'High-performance GPU mining for Ethereum and other altcoins with RTX 4090 rigs.',
    100, 
    1000, 
    2.8, 
    35,
    (SELECT id FROM plan_categories WHERE name = 'ethereum-mining'),
    '["RTX 4090 GPUs", "Ethereum Mining", "Auto-switching", "Overclocking", "24/7 Monitoring"]',
    'Medium',
    'GPU Mining',
    '130 MH/s',
    '450W per GPU',
    true
),

-- Cloud Mining Plans
(
    'Cloud Mining Starter', 
    'Hassle-free cloud mining without hardware maintenance. Mine Bitcoin remotely.',
    25, 
    250, 
    2.0, 
    25,
    (SELECT id FROM plan_categories WHERE name = 'cloud-mining'),
    '["No Hardware Needed", "Remote Mining", "Instant Start", "Multiple Cryptocurrencies", "Mobile App"]',
    'Low',
    'Cloud Mining',
    'Variable',
    '0W (Cloud)',
    true
),

-- DeFi Staking Plans
(
    'DeFi Yield Farming', 
    'Automated DeFi yield farming across multiple protocols for maximum returns.',
    200, 
    5000, 
    3.8, 
    90,
    (SELECT id FROM plan_categories WHERE name = 'defi-staking'),
    '["Multi-Protocol Staking", "Automated Compounding", "Liquidity Mining", "Risk Management", "Real-time Yields"]',
    'High',
    'DeFi Staking',
    'N/A',
    'N/A',
    true
),

-- Altcoin Mining
(
    'Multi-Coin Miner', 
    'Diversified mining across profitable altcoins with automatic profit switching.',
    75, 
    750, 
    3.0, 
    40,
    (SELECT id FROM plan_categories WHERE name = 'altcoin-mining'),
    '["Multi-Algorithm Mining", "Profit Switching", "Diverse Coin Portfolio", "Risk Diversification", "Advanced Analytics"]',
    'Medium',
    'Multi-Coin Mining',
    'Variable',
    'Optimized',
    true
);

-- ===============================================
-- 5. UPDATE SYSTEM SETTINGS FOR MINING THEME
-- ===============================================

-- Create system settings table if not exists
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert mining-themed system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('platform_theme', 'mining', 'Platform theme set to crypto mining'),
('platform_name', 'WeEarn Mining', 'Updated platform name for mining focus'),
('welcome_message', 'Start Your Crypto Mining Journey', 'Welcome message for new mining theme'),
('min_deposit', '25', 'Minimum deposit amount for mining plans'),
('max_deposit', '50000', 'Maximum deposit amount for mining plans'),
('withdrawal_fee_percent', '3', 'Reduced withdrawal fee for mining platform'),
('mining_dashboard_enabled', 'true', 'Enable mining-specific dashboard features'),
('real_time_mining_stats', 'true', 'Show real-time mining statistics'),
('mining_calculator_enabled', 'true', 'Enable mining profitability calculator')
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
updated_at = CURRENT_TIMESTAMP;

-- PostgreSQL doesn't need to re-enable foreign key checks

-- ===============================================
-- 6. VERIFICATION QUERIES
-- ===============================================

-- Verify the reset
SELECT 'Database Reset Complete' as status;
SELECT COUNT(*) as plan_count FROM plans;
SELECT COUNT(*) as category_count FROM plan_categories;
SELECT COUNT(*) as user_count FROM profiles;
SELECT COUNT(*) as transaction_count FROM transactions;

-- Show new mining plans
SELECT 
    p.name,
    p.min_amount,
    p.max_amount,
    p.roi_daily_percent,
    p.duration_days,
    pc.name as category,
    p.mining_type,
    p.hash_rate
FROM plans p 
JOIN plan_categories pc ON p.category_id = pc.id
ORDER BY pc.name, p.min_amount;
