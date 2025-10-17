-- Fix RLS Policies to Prevent Infinite Recursion
-- The issue is that admin policies are checking user_profiles table while querying user_profiles table

-- First, drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can do everything on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can do everything on user_balances" ON user_balances;
DROP POLICY IF EXISTS "Admins can do everything on deposits" ON deposits;
DROP POLICY IF EXISTS "Admins can do everything on user_investments" ON user_investments;
DROP POLICY IF EXISTS "Admins can do everything on daily_earnings" ON daily_earnings;
DROP POLICY IF EXISTS "Admins can do everything on withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Admins can do everything on referral_commissions" ON referral_commissions;
DROP POLICY IF EXISTS "Admins can do everything on transaction_logs" ON transaction_logs;
DROP POLICY IF EXISTS "Admins can manage investment_plans" ON investment_plans;

-- Create a function to check if user is admin using auth metadata instead of user_profiles table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in auth metadata
  RETURN (auth.jwt() ->> 'role' = 'admin') OR 
         (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
         (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Create admin policies that don't cause recursion
-- These policies allow admin access without checking user_profiles table

-- For user_profiles, create a simple admin policy
CREATE POLICY "Admins can manage user_profiles" ON user_profiles FOR ALL USING (
    auth.uid() IN (
        SELECT user_id FROM user_profiles 
        WHERE role = 'admin' 
        AND user_id = auth.uid()
    )
);

-- For other tables, use a simpler approach - allow service role access
-- Service role bypasses RLS anyway, so we focus on user-level policies

-- Create policies that allow both user access and service role access
CREATE POLICY "Users and service can view user_balances" ON user_balances FOR SELECT USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Users and service can view deposits" ON deposits FOR SELECT USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Users and service can view user_investments" ON user_investments FOR SELECT USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Users and service can view daily_earnings" ON daily_earnings FOR SELECT USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Users and service can view withdrawals" ON withdrawals FOR SELECT USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Users and service can view referral_commissions" ON referral_commissions FOR SELECT USING (
    auth.uid() = referrer_user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Users and service can view transaction_logs" ON transaction_logs FOR SELECT USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
);

-- Allow service role to do everything (for admin operations)
CREATE POLICY "Service role can manage user_balances" ON user_balances FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage deposits" ON deposits FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage user_investments" ON user_investments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage daily_earnings" ON daily_earnings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage withdrawals" ON withdrawals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage referral_commissions" ON referral_commissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage transaction_logs" ON transaction_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage investment_plans" ON investment_plans FOR ALL USING (auth.role() = 'service_role');
