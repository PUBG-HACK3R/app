-- ===============================================
-- WeEarn Mining Platform - Production Database Setup
-- ===============================================
-- This script sets up the complete database for production

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

-- 3. ENSURE CORE TABLES EXIST WITH CORRECT STRUCTURE
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
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'bitcoin',
    color VARCHAR(20) DEFAULT '#F7931A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for plan categories name
ALTER TABLE plan_categories ADD CONSTRAINT IF NOT EXISTS plan_categories_name_unique UNIQUE (name);

-- 5. CREATE UNIFIED PLANS TABLE (MINING FOCUSED)
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    roi_daily_percent DECIMAL(5,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    category_id INTEGER REFERENCES plan_categories(id),
    
    -- Mining-specific columns
    mining_type VARCHAR(100) DEFAULT 'ASIC Mining',
    hash_rate VARCHAR(50) DEFAULT '0 TH/s',
    power_consumption VARCHAR(50) DEFAULT '0W',
    risk_level VARCHAR(20) DEFAULT 'Medium' CHECK (risk_level IN ('Low', 'Medium', 'High')),
    features JSON,
    
    -- Status and timestamps
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for plans name
ALTER TABLE plans ADD CONSTRAINT IF NOT EXISTS plans_name_unique UNIQUE (name);

-- 6. CREATE OTHER ESSENTIAL TABLES
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'earning', 'referral')),
    amount_usdt DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
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
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    processing_started_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    amount_usdt DECIMAL(15,2) NOT NULL,
    tx_hash VARCHAR(255),
    network VARCHAR(50) DEFAULT 'TRC20',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(referrer_id, referred_id)
);

-- 7. INSERT MINING PLAN CATEGORIES
INSERT INTO plan_categories (name, description, icon, color) VALUES
('bitcoin-mining', 'Bitcoin Mining Operations', 'bitcoin', '#F7931A'),
('ethereum-mining', 'Ethereum Mining Pools', 'ethereum', '#627EEA'),
('altcoin-mining', 'Alternative Cryptocurrency Mining', 'coins', '#00D4AA'),
('cloud-mining', 'Cloud Mining Services', 'cloud', '#4285F4'),
('defi-staking', 'DeFi Staking Rewards', 'trending-up', '#9C27B0')
ON CONFLICT (name) DO NOTHING;

-- 8. INSERT PRODUCTION MINING PLANS
INSERT INTO plans (
    name, description, min_amount, max_amount, roi_daily_percent, duration_days,
    category_id, mining_type, hash_rate, power_consumption, risk_level, features, is_active
) VALUES
-- Starter Plans
(
    'Micro Bitcoin Miner', 
    'Perfect starter plan for new miners. Low risk, steady returns with shared ASIC mining.',
    50, 50, 1.8, 20,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'Shared ASIC', '5 TH/s', '150W', 'Low',
    '["Shared ASIC Mining", "Daily Payouts", "24/7 Support", "Mobile Monitoring"]',
    true
),
(
    'Basic Bitcoin Miner', 
    'Popular choice for beginners. Dedicated mining power with good daily returns.',
    100, 100, 2.2, 25,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'ASIC S9', '14 TH/s', '300W', 'Low',
    '["Dedicated Mining", "Real-time Stats", "Daily Rewards", "Email Notifications"]',
    true
),
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
    'Professional Bitcoin mining operation with latest S19 Pro miners and optimized cooling.',
    1000, 2500, 3.2, 45,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'ASIC S19 Pro', '110 TH/s', '3050W', 'Medium',
    '["ASIC S19 Pro", "Advanced Cooling", "Priority Support", "Real-time Analytics", "Mining Optimization"]',
    true
),
(
    'Bitcoin Enterprise Farm', 
    'Large-scale Bitcoin mining farm with industrial-grade equipment and renewable energy.',
    2500, 10000, 4.1, 60,
    (SELECT id FROM plan_categories WHERE name = 'bitcoin-mining'),
    'Industrial Mining', '500+ TH/s', '15000W+', 'Medium',
    '["Industrial ASIC Farm", "Renewable Energy", "Dedicated Support", "Custom Mining Pool", "Advanced Analytics", "Insurance Coverage"]',
    true
)
ON CONFLICT (name) DO UPDATE SET
    min_amount = EXCLUDED.min_amount,
    max_amount = EXCLUDED.max_amount,
    roi_daily_percent = EXCLUDED.roi_daily_percent,
    is_active = EXCLUDED.is_active;

-- 9. CREATE ADMIN USER (Replace with your actual user ID)
INSERT INTO profiles (user_id, email, role, created_at) 
VALUES ('8199239d-6d8d-4f30-93fa-61d6019e20d9', 'rtwnoyan@gmail.com', 'admin', NOW()) 
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    email = EXCLUDED.email,
    updated_at = NOW();

-- 10. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- 11. ENABLE RLS WITH SIMPLE POLICIES (PRODUCTION SAFE)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple, non-recursive policies
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin can see all profiles (non-recursive)
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 12. VERIFICATION
SELECT 
    'Production Database Setup Complete!' as status,
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
