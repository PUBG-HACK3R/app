-- ===============================================
-- WeEarn Mining Platform - Simple Production Setup
-- ===============================================
-- This script avoids ON CONFLICT issues by using simpler approach

-- 1. DISABLE RLS TEMPORARILY FOR SETUP
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL PROBLEMATIC POLICIES
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- 3. ENSURE CORE TABLES EXIST
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    balance_usdt DECIMAL(15,2) DEFAULT 0.00,
    total_invested DECIMAL(15,2) DEFAULT 0.00,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES profiles(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREATE PLAN CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS plan_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'bitcoin',
    color VARCHAR(20) DEFAULT '#F7931A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CREATE PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    roi_daily_percent DECIMAL(5,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    category_id INTEGER REFERENCES plan_categories(id),
    mining_type VARCHAR(100) DEFAULT 'ASIC Mining',
    hash_rate VARCHAR(50) DEFAULT '0 TH/s',
    power_consumption VARCHAR(50) DEFAULT '0W',
    risk_level VARCHAR(20) DEFAULT 'Medium',
    features JSON,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. CREATE OTHER ESSENTIAL TABLES
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount_usdt DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    amount_invested DECIMAL(15,2) NOT NULL,
    daily_earning DECIMAL(15,2) NOT NULL,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    amount_usdt DECIMAL(15,2) NOT NULL,
    fee_usdt DECIMAL(15,2) DEFAULT 0.00,
    net_amount_usdt DECIMAL(15,2) NOT NULL,
    address VARCHAR(255) NOT NULL,
    network VARCHAR(50) DEFAULT 'TRC20',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CLEAN EXISTING DATA (Correct order: plans first, then categories)
-- Delete plans first to avoid foreign key constraint violations
DELETE FROM plans WHERE name IN ('Micro Bitcoin Miner', 'Basic Bitcoin Miner', 'Advanced Bitcoin Miner', 'Bitcoin Pro Miner', 'Bitcoin Enterprise Farm');

-- Now safe to delete categories
DELETE FROM plan_categories WHERE name IN ('bitcoin-mining', 'ethereum-mining', 'altcoin-mining', 'cloud-mining', 'defi-staking');

-- 8. INSERT PLAN CATEGORIES
INSERT INTO plan_categories (name, description, icon, color) VALUES
('bitcoin-mining', 'Bitcoin Mining Operations', 'bitcoin', '#F7931A'),
('ethereum-mining', 'Ethereum Mining Pools', 'ethereum', '#627EEA'),
('altcoin-mining', 'Alternative Cryptocurrency Mining', 'coins', '#00D4AA'),
('cloud-mining', 'Cloud Mining Services', 'cloud', '#4285F4'),
('defi-staking', 'DeFi Staking Rewards', 'trending-up', '#9C27B0');

-- 9. INSERT MINING PLANS

INSERT INTO plans (
    name, description, min_amount, max_amount, roi_daily_percent, duration_days,
    category_id, mining_type, hash_rate, power_consumption, risk_level, features, is_active
) VALUES
-- $50 Plan
(
    'Micro Bitcoin Miner', 
    'Perfect starter plan for new miners. Low risk, steady returns with shared ASIC mining.',
    50, 50, 1.8, 20,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'Shared ASIC', '5 TH/s', '150W', 'Low',
    '["Shared ASIC Mining", "Daily Payouts", "24/7 Support", "Mobile Monitoring"]',
    true
),
-- $100 Plan
(
    'Basic Bitcoin Miner', 
    'Popular choice for beginners. Dedicated mining power with good daily returns.',
    100, 100, 2.2, 25,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'ASIC S9', '14 TH/s', '300W', 'Low',
    '["Dedicated Mining", "Real-time Stats", "Daily Rewards", "Email Notifications"]',
    true
),
-- $500 Plan
(
    'Advanced Bitcoin Miner', 
    'Professional mining with latest hardware. Higher returns for serious miners.',
    500, 500, 2.8, 30,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'ASIC S19', '95 TH/s', '3250W', 'Medium',
    '["ASIC S19 Mining", "Priority Support", "Advanced Analytics", "Auto-compound Option"]',
    true
),
-- Professional Plans
(
    'Bitcoin Pro Miner', 
    'Professional Bitcoin mining operation with latest S19 Pro miners.',
    1000, 2500, 3.2, 45,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'ASIC S19 Pro', '110 TH/s', '3050W', 'Medium',
    '["ASIC S19 Pro", "Advanced Cooling", "Priority Support", "Real-time Analytics"]',
    true
),
-- Enterprise Plan
(
    'Bitcoin Enterprise Farm', 
    'Large-scale Bitcoin mining farm with industrial-grade equipment.',
    2500, 10000, 4.1, 60,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'Industrial Mining', '500+ TH/s', '15000W+', 'Medium',
    '["Industrial ASIC Farm", "Renewable Energy", "Dedicated Support", "Custom Mining Pool"]',
    true
);

-- 10. CREATE YOUR ADMIN PROFILE (Simple approach)
DELETE FROM profiles WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

INSERT INTO profiles (user_id, email, role, created_at) 
VALUES ('8199239d-6d8d-4f30-93fa-61d6019e20d9', 'rtwnoyan@gmail.com', 'admin', NOW());

-- 11. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- 12. ENABLE RLS WITH SIMPLE POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple policies that won't cause recursion
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 13. VERIFICATION
SELECT 
    'Simple Production Setup Complete!' as status,
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM plans WHERE is_active = true) as active_plans,
    (SELECT COUNT(*) FROM plan_categories) as plan_categories,
    (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_users;

-- Show your admin status
SELECT 
    'Your Admin Status:' as info,
    user_id,
    email,
    role,
    created_at
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';
