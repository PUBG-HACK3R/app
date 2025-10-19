-- Manual Database Setup for Referral Levels System
-- Run this SQL in your Supabase SQL editor or database console

-- 1. Create referral_levels table
CREATE TABLE IF NOT EXISTS referral_levels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level_name TEXT NOT NULL UNIQUE,
    level_order INTEGER NOT NULL UNIQUE,
    min_referrals INTEGER NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    level_color TEXT NOT NULL,
    level_icon TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_referral_levels table
CREATE TABLE IF NOT EXISTS user_referral_levels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level_id UUID REFERENCES referral_levels(id),
    total_referrals INTEGER DEFAULT 0,
    total_level_rewards DECIMAL(10,2) DEFAULT 0,
    last_level_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Create referral_level_rewards table
CREATE TABLE IF NOT EXISTS referral_level_rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES referral_levels(id),
    reward_amount DECIMAL(10,2) NOT NULL,
    referrals_at_time INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 4. Insert default referral levels
INSERT INTO referral_levels (level_name, level_order, min_referrals, reward_amount, level_color, level_icon) VALUES
('Bronze', 0, 0, 0, '#CD7F32', 'Shield'),
('Silver', 1, 5, 10.00, '#C0C0C0', 'Award'),
('Gold', 2, 20, 50.00, '#FFD700', 'Crown'),
('Diamond', 3, 50, 300.00, '#B9F2FF', 'Gem')
ON CONFLICT (level_name) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_referral_levels_user_id ON user_referral_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_level_rewards_user_id ON referral_level_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_level_rewards_status ON referral_level_rewards(status);
CREATE INDEX IF NOT EXISTS idx_referral_levels_order ON referral_levels(level_order);

-- 6. Enable RLS
ALTER TABLE referral_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referral_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_level_rewards ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Anyone can view referral levels (public information)
DROP POLICY IF EXISTS "Anyone can view referral levels" ON referral_levels;
CREATE POLICY "Anyone can view referral levels" ON referral_levels FOR SELECT USING (true);

-- Users can only see their own referral level data
DROP POLICY IF EXISTS "Users can view own referral level" ON user_referral_levels;
CREATE POLICY "Users can view own referral level" ON user_referral_levels FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own level rewards" ON referral_level_rewards;
CREATE POLICY "Users can view own level rewards" ON referral_level_rewards FOR SELECT USING (auth.uid() = user_id);

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can do everything on referral_levels" ON referral_levels;
CREATE POLICY "Admins can do everything on referral_levels" ON referral_levels FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can do everything on user_referral_levels" ON user_referral_levels;
CREATE POLICY "Admins can do everything on user_referral_levels" ON user_referral_levels FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can do everything on referral_level_rewards" ON referral_level_rewards;
CREATE POLICY "Admins can do everything on referral_level_rewards" ON referral_level_rewards FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Verify setup
SELECT 'Setup complete! Levels created:' as message;
SELECT level_name, min_referrals, reward_amount FROM referral_levels ORDER BY level_order;
