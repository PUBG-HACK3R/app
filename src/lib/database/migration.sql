-- Clean Database Migration for WeEarn Platform
-- This will create a simplified, error-free database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS transaction_logs CASCADE;
DROP TABLE IF EXISTS referral_commissions CASCADE;
DROP TABLE IF EXISTS daily_earnings CASCADE;
DROP TABLE IF EXISTS user_investments CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;
DROP TABLE IF EXISTS investment_plans CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop old tables that might exist
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS balances CASCADE;

-- 1. User Profiles
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    referral_code TEXT NOT NULL UNIQUE,
    referred_by TEXT, -- Referral code of who referred this user
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.1. Admin Users (Flexible admin login system)
CREATE TABLE admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    permissions JSONB DEFAULT '["read", "write"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Investment Plans
CREATE TABLE investment_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    min_amount DECIMAL(10,2) NOT NULL CHECK (min_amount > 0),
    max_amount DECIMAL(10,2) NOT NULL CHECK (max_amount >= min_amount),
    daily_roi_percentage DECIMAL(5,3) NOT NULL CHECK (daily_roi_percentage > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Balances (Single source of truth)
CREATE TABLE user_balances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    available_balance DECIMAL(12,2) DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance DECIMAL(12,2) DEFAULT 0 CHECK (locked_balance >= 0),
    total_deposited DECIMAL(12,2) DEFAULT 0 CHECK (total_deposited >= 0),
    total_withdrawn DECIMAL(12,2) DEFAULT 0 CHECK (total_withdrawn >= 0),
    total_earned DECIMAL(12,2) DEFAULT 0 CHECK (total_earned >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Deposits (NOWPayments only)
CREATE TABLE deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL UNIQUE, -- NOWPayments order ID
    amount_usdt DECIMAL(10,2) NOT NULL CHECK (amount_usdt > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'expired')),
    payment_id TEXT, -- NOWPayments payment ID
    tx_hash TEXT, -- Transaction hash
    nowpayments_data JSONB, -- Raw NOWPayments webhook data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- 5. User Investments/Subscriptions
CREATE TABLE user_investments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES investment_plans(id) ON DELETE RESTRICT,
    amount_invested DECIMAL(10,2) NOT NULL CHECK (amount_invested > 0),
    daily_roi_percentage DECIMAL(5,3) NOT NULL CHECK (daily_roi_percentage > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_earned DECIMAL(10,2) DEFAULT 0 CHECK (total_earned >= 0),
    last_earning_date DATE,
    next_earning_time TIMESTAMPTZ NOT NULL, -- Individual earning time for each investment
    investment_time TIMESTAMPTZ DEFAULT NOW(), -- Time when investment was made
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Daily Earnings Records
CREATE TABLE daily_earnings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES user_investments(id) ON DELETE CASCADE,
    amount_usdt DECIMAL(8,4) NOT NULL CHECK (amount_usdt > 0),
    earning_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(investment_id, earning_date) -- Prevent duplicate earnings for same day
);

-- 7. Withdrawals
CREATE TABLE withdrawals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_usdt DECIMAL(10,2) NOT NULL CHECK (amount_usdt > 0),
    fee_usdt DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (fee_usdt >= 0),
    net_amount_usdt DECIMAL(10,2) NOT NULL CHECK (net_amount_usdt > 0),
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected', 'expired')),
    admin_notes TEXT,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. Referral Commissions
CREATE TABLE referral_commissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('deposit', 'investment')),
    source_amount DECIMAL(10,2) NOT NULL CHECK (source_amount > 0),
    commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage > 0),
    commission_amount DECIMAL(8,4) NOT NULL CHECK (commission_amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 9. Transaction Log (For audit trail)
CREATE TABLE transaction_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'earning', 'referral_commission', 'investment')),
    amount_usdt DECIMAL(10,4) NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID, -- ID of related record
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);
CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_order_id ON deposits(order_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_user_investments_user_id ON user_investments(user_id);
CREATE INDEX idx_user_investments_status ON user_investments(status);
CREATE INDEX idx_user_investments_next_earning ON user_investments(next_earning_time);
CREATE INDEX idx_daily_earnings_user_id ON daily_earnings(user_id);
CREATE INDEX idx_daily_earnings_investment_id ON daily_earnings(investment_id);
CREATE INDEX idx_daily_earnings_date ON daily_earnings(earning_date);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_referral_commissions_referrer ON referral_commissions(referrer_user_id);
CREATE INDEX idx_transaction_logs_user_id ON transaction_logs(user_id);
CREATE INDEX idx_transaction_logs_type ON transaction_logs(type);

-- Insert default investment plans
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_roi_percentage, duration_days) VALUES
('Starter Plan', 'Perfect for beginners - Low risk, steady returns', 50.00, 499.99, 1.0, 30),
('Pro Plan', 'For experienced investors - Higher returns', 500.00, 1999.99, 1.2, 45),
('Elite Plan', 'Premium plan - Maximum returns for serious investors', 2000.00, 10000.00, 1.5, 60);

-- Insert default admin user (password: admin123 - change this!)
INSERT INTO admin_users (username, email, password_hash, full_name, role, permissions) VALUES
('admin', 'admin@weearn.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'super_admin', 
'["read", "write", "delete", "manage_users", "manage_plans", "manage_withdrawals", "view_analytics"]'::jsonb);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := 'REF' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = code) INTO exists;
        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION create_user_profile() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, email, referral_code)
    VALUES (NEW.id, NEW.email, generate_referral_code());
    
    INSERT INTO user_balances (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to update user_balances.updated_at
CREATE OR REPLACE FUNCTION update_balance_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on balance changes
CREATE TRIGGER update_user_balances_timestamp
    BEFORE UPDATE ON user_balances
    FOR EACH ROW EXECUTE FUNCTION update_balance_timestamp();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own data
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own balance" ON user_balances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own deposits" ON deposits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own investments" ON user_investments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own earnings" ON daily_earnings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referral commissions" ON referral_commissions FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can view own transaction logs" ON transaction_logs FOR SELECT USING (auth.uid() = user_id);

-- Investment plans are public (read-only for users)
ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON investment_plans FOR SELECT USING (is_active = true);

-- Admin policies (bypass RLS for admin users)
CREATE POLICY "Admins can do everything on user_profiles" ON user_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on user_balances" ON user_balances FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on deposits" ON deposits FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on user_investments" ON user_investments FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on daily_earnings" ON daily_earnings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on withdrawals" ON withdrawals FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on referral_commissions" ON referral_commissions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can do everything on transaction_logs" ON transaction_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage investment_plans" ON investment_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

COMMENT ON TABLE user_profiles IS 'User profile information and referral codes';
COMMENT ON TABLE investment_plans IS 'Available investment plans with ROI and duration';
COMMENT ON TABLE user_balances IS 'Single source of truth for user balances';
COMMENT ON TABLE deposits IS 'NOWPayments deposit records';
COMMENT ON TABLE user_investments IS 'Active user investments in plans';
COMMENT ON TABLE daily_earnings IS 'Daily earnings from investments';
COMMENT ON TABLE withdrawals IS 'Withdrawal requests and processing';
COMMENT ON TABLE referral_commissions IS 'Referral commission tracking';
COMMENT ON TABLE transaction_logs IS 'Audit trail of all balance changes';
