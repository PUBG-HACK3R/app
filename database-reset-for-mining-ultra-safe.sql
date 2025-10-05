-- ===============================================
-- WeEarn Database Reset for Bitcoin Mining System (ULTRA SAFE VERSION)
-- ===============================================
-- WARNING: This will delete ALL existing data!
-- This version handles existing table structures safely

-- ===============================================
-- 1. SAFELY DELETE ALL EXISTING DATA
-- ===============================================

-- Delete user data (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DELETE FROM profiles;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        DELETE FROM transactions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        DELETE FROM subscriptions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        DELETE FROM withdrawals;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'deposits') THEN
        DELETE FROM deposits;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referrals') THEN
        DELETE FROM referrals;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
    END IF;
    
    -- Delete admin data (only if tables exist)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        DELETE FROM admin_users;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_sessions') THEN
        DELETE FROM admin_sessions;
    END IF;
    
    -- Delete plan data (only if tables exist)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans') THEN
        DELETE FROM plans;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plan_categories') THEN
        DELETE FROM plan_categories;
    END IF;
END $$;

-- ===============================================
-- 2. DROP AND RECREATE PLANS TABLES COMPLETELY
-- ===============================================

-- Drop existing plans table if it exists (to avoid column conflicts)
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS plan_categories CASCADE;

-- Create plan categories table
CREATE TABLE plan_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'bitcoin',
    color VARCHAR(20) DEFAULT '#F7931A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create plans table with all required columns
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    roi_daily_percent DECIMAL(5,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    category_id INTEGER REFERENCES plan_categories(id),
    features JSON,
    risk_level VARCHAR(20) DEFAULT 'Medium',
    mining_type VARCHAR(100) DEFAULT 'ASIC Mining',
    hash_rate VARCHAR(50) DEFAULT '0 TH/s',
    power_consumption VARCHAR(50) DEFAULT '0W',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 3. INSERT NEW MINING PLAN CATEGORIES
-- ===============================================

INSERT INTO plan_categories (name, description, icon, color) VALUES
('bitcoin-mining', 'Bitcoin Mining Operations', 'bitcoin', '#F7931A'),
('ethereum-mining', 'Ethereum Mining Pools', 'ethereum', '#627EEA'),
('altcoin-mining', 'Alternative Cryptocurrency Mining', 'coins', '#00D4AA'),
('cloud-mining', 'Cloud Mining Services', 'cloud', '#4285F4'),
('defi-staking', 'DeFi Staking Rewards', 'trending-up', '#9C27B0'),
('nft-mining', 'NFT Collection Mining', 'image', '#FF6B35');

-- ===============================================
-- 4. INSERT NEW BITCOIN MINING PLANS
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
    is_active
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
-- 5. CREATE SYSTEM SETTINGS TABLE AND INSERT DATA
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

-- ===============================================
-- 6. VERIFICATION QUERIES
-- ===============================================

-- Verify the reset
SELECT 'Database Reset Complete - All Old Data Deleted' as status;
SELECT COUNT(*) as plan_count FROM plans;
SELECT COUNT(*) as category_count FROM plan_categories;

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

SELECT 'WeEarn Mining Platform Database Setup Complete - Fresh Start!' as final_status;
