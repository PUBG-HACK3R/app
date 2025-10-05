-- ===============================================
-- FIX REFERRAL CODES - Generate for All Users
-- ===============================================

-- 1. Check current referral codes
SELECT user_id, email, referral_code FROM profiles WHERE referral_code IS NOT NULL;

-- 2. Generate referral codes for users who don't have them
UPDATE profiles 
SET referral_code = 'REF' || UPPER(SUBSTRING(user_id::text, 1, 8))
WHERE referral_code IS NULL;

-- 3. Verify all users now have referral codes
SELECT user_id, email, referral_code FROM profiles ORDER BY created_at;

-- 4. Test a specific referral code (replace with actual code from above)
-- SELECT * FROM profiles WHERE referral_code = 'REF12345678';

-- ===============================================
-- QUICK TEST COMMANDS:
-- ===============================================
-- Run these to debug the referral system:

-- Check if any users exist:
-- SELECT COUNT(*) as total_users FROM profiles;

-- Check if referral codes exist:
-- SELECT COUNT(*) as users_with_codes FROM profiles WHERE referral_code IS NOT NULL;

-- Get a sample referral code to test:
-- SELECT referral_code FROM profiles WHERE referral_code IS NOT NULL LIMIT 1;
