-- Debug referral relationships and check what's happening
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if referrals table exists and has data
SELECT 'Referrals table check:' as info;
SELECT COUNT(*) as total_referrals FROM public.referrals;
SELECT * FROM public.referrals LIMIT 5;

-- 2. Check profiles with referral codes
SELECT 'Profiles with referral codes:' as info;
SELECT email, referral_code, total_referrals, referred_by FROM public.profiles 
WHERE referral_code IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if RLS is blocking referrals table access
SELECT 'RLS status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'referrals', 'referral_commissions');

-- 4. Check for any referral relationships
SELECT 'Referral relationships:' as info;
SELECT 
  r.id,
  r.referral_code,
  r.status,
  r.created_at,
  referrer.email as referrer_email,
  referred.email as referred_email
FROM public.referrals r
LEFT JOIN public.profiles referrer ON r.referrer_id = referrer.user_id
LEFT JOIN public.profiles referred ON r.referred_id = referred.user_id
ORDER BY r.created_at DESC
LIMIT 10;

-- 5. Fix RLS policies if needed
-- Disable RLS on referrals table for testing
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;

-- 6. Check recent signups to see if they have referred_by set
SELECT 'Recent signups:' as info;
SELECT email, referral_code, referred_by, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;
