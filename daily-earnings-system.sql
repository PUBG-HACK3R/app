-- ===============================================
-- DAILY EARNINGS & REFERRAL COMMISSION SYSTEM
-- ===============================================
-- This creates a system where referrers earn 5% of their referrals' daily profits

-- 1. CREATE DAILY EARNINGS TABLE
CREATE TABLE IF NOT EXISTS daily_earnings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_amount DECIMAL(15,2) NOT NULL,
    commission_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subscription_id, earning_date)
);

-- 2. CREATE REFERRAL COMMISSIONS TABLE
CREATE TABLE IF NOT EXISTS referral_commissions (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    daily_earning_id INTEGER NOT NULL REFERENCES daily_earnings(id) ON DELETE CASCADE,
    commission_amount DECIMAL(15,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CREATE FUNCTION TO PROCESS DAILY EARNINGS
CREATE OR REPLACE FUNCTION process_daily_earnings()
RETURNS void AS $$
DECLARE
    sub_record RECORD;
    daily_earning_amount DECIMAL(15,2);
    earning_id INTEGER;
    referrer_record RECORD;
    commission_amount DECIMAL(15,2);
BEGIN
    -- Process all active subscriptions
    FOR sub_record IN 
        SELECT s.*, p.roi_daily_percent, pr.user_id as subscriber_id, pr.referred_by
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        JOIN profiles pr ON s.user_id = pr.user_id
        WHERE s.active = true 
        AND s.end_date > CURRENT_DATE
    LOOP
        -- Calculate daily earning
        daily_earning_amount := sub_record.amount_invested * (sub_record.roi_daily_percent / 100);
        
        -- Insert daily earning record
        INSERT INTO daily_earnings (
            user_id, 
            subscription_id, 
            plan_id, 
            earning_date, 
            daily_amount
        ) VALUES (
            sub_record.subscriber_id,
            sub_record.id,
            sub_record.plan_id,
            CURRENT_DATE,
            daily_earning_amount
        ) 
        ON CONFLICT (user_id, subscription_id, earning_date) 
        DO NOTHING
        RETURNING id INTO earning_id;
        
        -- If earning was created and user has a referrer
        IF earning_id IS NOT NULL AND sub_record.referred_by IS NOT NULL THEN
            -- Calculate 5% commission on daily profit
            commission_amount := daily_earning_amount * 0.05;
            
            -- Insert referral commission
            INSERT INTO referral_commissions (
                referrer_id,
                referred_id,
                daily_earning_id,
                commission_amount,
                commission_rate,
                earning_date
            ) VALUES (
                sub_record.referred_by,
                sub_record.subscriber_id,
                earning_id,
                commission_amount,
                5.00,
                CURRENT_DATE
            );
            
            -- Add commission to referrer's balance
            UPDATE profiles 
            SET balance_usdt = balance_usdt + commission_amount,
                total_earned = total_earned + commission_amount
            WHERE user_id = sub_record.referred_by;
            
            -- Update referrals table total_earned
            UPDATE referrals 
            SET total_earned = total_earned + commission_amount
            WHERE referrer_id = sub_record.referred_by 
            AND referred_id = sub_record.subscriber_id;
        END IF;
        
        -- Add daily earning to user's balance
        UPDATE profiles 
        SET balance_usdt = balance_usdt + daily_earning_amount,
            total_earned = total_earned + daily_earning_amount
        WHERE user_id = sub_record.subscriber_id;
        
        -- Update subscription total earned
        UPDATE subscriptions 
        SET total_earned = total_earned + daily_earning_amount
        WHERE id = sub_record.id;
        
        -- Create transaction record
        INSERT INTO transactions (
            user_id,
            type,
            amount_usdt,
            status,
            description
        ) VALUES (
            sub_record.subscriber_id,
            'earning',
            daily_earning_amount,
            'completed',
            'Daily mining profit from ' || (SELECT name FROM plans WHERE id = sub_record.plan_id)
        );
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_daily_earnings_user_date ON daily_earnings(user_id, earning_date);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_date ON daily_earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_date ON referral_commissions(earning_date);

-- 5. GRANT PERMISSIONS
GRANT ALL ON daily_earnings TO postgres, service_role;
GRANT ALL ON referral_commissions TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON daily_earnings TO authenticated;
GRANT SELECT ON referral_commissions TO authenticated;

-- 6. ENABLE RLS
ALTER TABLE daily_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- 7. CREATE RLS POLICIES
CREATE POLICY "daily_earnings_own" ON daily_earnings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "referral_commissions_own" ON referral_commissions
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ===============================================
-- USAGE INSTRUCTIONS:
-- ===============================================
-- 1. Run this script to create the system
-- 2. Call process_daily_earnings() function daily (via cron job)
-- 3. Example: SELECT process_daily_earnings();
-- 
-- HOW IT WORKS:
-- - User A refers User B
-- - User B buys $100 plan (2.2% daily = $2.20/day)
-- - Every day: User B gets $2.20, User A gets $0.11 (5% of $2.20)
-- - Commission is paid daily as long as the plan is active
-- ===============================================
