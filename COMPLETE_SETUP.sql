-- ===============================================
-- WeEarn Mining Platform - COMPLETE SETUP
-- ===============================================
-- This is the ONLY script you need for a fresh Supabase project
-- Run this in Supabase SQL Editor after creating a new project

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. CREATE ALL TABLES
-- Profiles table (user data)
CREATE TABLE profiles (
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

-- Plan categories table
CREATE TABLE plan_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'bitcoin',
    color VARCHAR(20) DEFAULT '#F7931A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table (mining investment plans)
CREATE TABLE plans (
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

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount_usdt DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table (user investments)
CREATE TABLE subscriptions (
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

-- Withdrawals table
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    amount_usdt DECIMAL(15,2) NOT NULL,
    fee_usdt DECIMAL(15,2) DEFAULT 0.00,
    net_amount_usdt DECIMAL(15,2) NOT NULL,
    address VARCHAR(255) NOT NULL,
    network VARCHAR(50) DEFAULT 'TRC20',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    processing_started_at TIMESTAMP
);

-- Deposits table
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    amount_usdt DECIMAL(15,2) NOT NULL,
    tx_hash VARCHAR(255),
    network VARCHAR(50) DEFAULT 'TRC20',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referrals table
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(referrer_id, referred_id)
);

-- 3. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(active);
CREATE INDEX idx_plans_active ON plans(is_active);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);

-- 4. INSERT PLAN CATEGORIES
INSERT INTO plan_categories (name, description, icon, color) VALUES
('bitcoin-mining', 'Bitcoin Mining Operations', 'bitcoin', '#F7931A'),
('ethereum-mining', 'Ethereum Mining Pools', 'ethereum', '#627EEA'),
('altcoin-mining', 'Alternative Cryptocurrency Mining', 'coins', '#00D4AA'),
('cloud-mining', 'Cloud Mining Services', 'cloud', '#4285F4'),
('defi-staking', 'DeFi Staking Rewards', 'trending-up', '#9C27B0');

-- 5. INSERT MINING PLANS
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
-- $1000+ Plan
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

-- 6. CREATE FUNCTION TO AUTO-CREATE PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE TRIGGER FOR AUTO PROFILE CREATION
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 9. CREATE RLS POLICIES
-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "transactions_own" ON transactions
    FOR ALL USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "subscriptions_own" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Withdrawals policies
CREATE POLICY "withdrawals_own" ON withdrawals
    FOR ALL USING (auth.uid() = user_id);

-- Deposits policies
CREATE POLICY "deposits_own" ON deposits
    FOR ALL USING (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "referrals_own" ON referrals
    FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Plans and categories are public read
CREATE POLICY "plans_public_read" ON plans
    FOR SELECT USING (true);

CREATE POLICY "plan_categories_public_read" ON plan_categories
    FOR SELECT USING (true);

-- 10. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON plans, plan_categories TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 11. FINAL VERIFICATION
SELECT 
    'WeEarn Mining Platform Setup Complete!' as status,
    (SELECT COUNT(*) FROM plan_categories) as categories_created,
    (SELECT COUNT(*) FROM plans WHERE is_active = true) as active_plans,
    'Ready for production!' as message;

-- 12. SHOW CREATED PLANS
SELECT 
    name,
    min_amount,
    max_amount,
    roi_daily_percent || '% daily' as returns,
    mining_type,
    hash_rate,
    is_active
FROM plans 
ORDER BY min_amount;

-- ===============================================
-- SETUP COMPLETE!
-- ===============================================
-- Your WeEarn Mining platform is now ready!
-- 
-- Next steps:
-- 1. Set up your .env.local file with Supabase keys
-- 2. Run: npm run dev
-- 3. Create your admin account by signing up
-- 4. Run this to make yourself admin:
--    UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- 
-- That's it! Your platform is production-ready.
-- ===============================================
