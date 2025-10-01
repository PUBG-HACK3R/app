-- Fix referral signup issues by ensuring proper permissions
-- Run this in Supabase SQL Editor

-- 1. Make sure RLS is disabled on all referral tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions DISABLE ROW LEVEL SECURITY;

-- 2. Grant proper permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.referral_commissions TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.referrals TO anon;

-- 3. Test the referral application for existing users
-- Apply referral for test2@gmail.com with referrer 9079C8
UPDATE public.profiles 
SET referred_by = (
    SELECT user_id FROM public.profiles WHERE referral_code = '9079C8'
)
WHERE email = 'test2@gmail.com' AND referred_by IS NULL;

-- Create referral record
INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code,
    status
) 
SELECT 
    referrer.user_id,
    referred.user_id,
    '9079C8',
    'active'
FROM public.profiles referred
CROSS JOIN public.profiles referrer
WHERE referred.email = 'test2@gmail.com'
  AND referrer.referral_code = '9079C8'
  AND NOT EXISTS (
      SELECT 1 FROM public.referrals r 
      WHERE r.referred_id = referred.user_id 
      AND r.referrer_id = referrer.user_id
  );

-- Update referrer count
UPDATE public.profiles 
SET total_referrals = (
    SELECT COUNT(*) FROM public.referrals WHERE referrer_id = public.profiles.user_id
)
WHERE referral_code = '9079C8';

-- 4. Show results
SELECT 'Results:' as info;
SELECT 
    p.email,
    p.referral_code,
    p.total_referrals,
    CASE WHEN p.referred_by IS NOT NULL THEN 'HAS REFERRER' ELSE 'NO REFERRER' END as referral_status
FROM public.profiles p
WHERE p.referral_code IS NOT NULL OR p.referred_by IS NOT NULL
ORDER BY p.created_at DESC;
