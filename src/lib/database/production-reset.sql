-- WeEarn Platform - Production Database Reset
-- This script clears all test data and prepares the database for real users
-- DANGER: This will delete ALL user data, transactions, and balances!

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- Clear all user-related data (keeping structure intact)
DELETE FROM transaction_logs;
DELETE FROM referral_commissions;
DELETE FROM daily_earnings;
DELETE FROM user_investments;
DELETE FROM withdrawals;
DELETE FROM deposits;
DELETE FROM user_balances;
DELETE FROM user_profiles;

-- Clear admin users (we'll create fresh ones)
DELETE FROM admin_users;

-- Clear any test auth users (if accessible)
-- Note: This might need to be done through Supabase dashboard
-- DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%demo%';

-- Reset sequences (if any exist)
-- ALTER SEQUENCE IF EXISTS some_sequence RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify investment plans are still there (should have 5 plans)
SELECT COUNT(*) as plan_count FROM investment_plans WHERE is_active = true;

-- Create fresh admin user for production
-- Password: WeEarn2024! (CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN)
INSERT INTO admin_users (
    username, 
    email, 
    password_hash, 
    full_name, 
    role, 
    permissions,
    is_active
) VALUES (
    'admin',
    'admin@weearn.com',
    '$2b$12$LQv3c1yqBwEHXw17kSHnu.1q/4.L5Xkz7mXAaH8kNuFNiagCh8WLO', -- WeEarn2024!
    'Production Administrator',
    'super_admin',
    '["read", "write", "delete", "manage_users", "manage_plans", "manage_withdrawals", "view_analytics", "system_admin"]'::jsonb,
    true
);

-- Verify the reset
SELECT 
    'user_profiles' as table_name, COUNT(*) as record_count FROM user_profiles
UNION ALL
SELECT 'user_balances', COUNT(*) FROM user_balances
UNION ALL
SELECT 'deposits', COUNT(*) FROM deposits
UNION ALL
SELECT 'user_investments', COUNT(*) FROM user_investments
UNION ALL
SELECT 'daily_earnings', COUNT(*) FROM daily_earnings
UNION ALL
SELECT 'withdrawals', COUNT(*) FROM withdrawals
UNION ALL
SELECT 'referral_commissions', COUNT(*) FROM referral_commissions
UNION ALL
SELECT 'transaction_logs', COUNT(*) FROM transaction_logs
UNION ALL
SELECT 'investment_plans', COUNT(*) FROM investment_plans WHERE is_active = true
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users WHERE is_active = true;

-- Show investment plans that will be available to users
SELECT 
    name,
    min_amount,
    max_amount,
    daily_roi_percentage,
    duration_days,
    payout_type,
    is_active
FROM investment_plans 
ORDER BY min_amount;

COMMENT ON SCRIPT IS 'Production database reset - removes all test data while preserving structure and investment plans';
