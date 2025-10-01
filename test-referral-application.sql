-- Test referral application manually
-- This will simulate what should happen during signup

-- 1. Find a user who signed up recently without referral applied
SELECT 'Recent user without referral:' as info;
SELECT user_id, email, referred_by FROM public.profiles 
WHERE email = 'test2@gmail.com' OR email = 'test@gmail.com'
LIMIT 1;

-- 2. Find the referrer (user with code 9079C8)
SELECT 'Referrer info:' as info;
SELECT user_id, email, referral_code FROM public.profiles 
WHERE referral_code = '9079C8';

-- 3. Manually apply the referral relationship
-- Replace the UUIDs below with actual values from the queries above

-- First, let's get the actual UUIDs
DO $$
DECLARE
    referred_user_id UUID;
    referrer_user_id UUID;
BEGIN
    -- Get the referred user (test2@gmail.com)
    SELECT user_id INTO referred_user_id 
    FROM public.profiles 
    WHERE email = 'test2@gmail.com';
    
    -- Get the referrer (user with 9079C8)
    SELECT user_id INTO referrer_user_id 
    FROM public.profiles 
    WHERE referral_code = '9079C8';
    
    -- Apply the referral if both users exist
    IF referred_user_id IS NOT NULL AND referrer_user_id IS NOT NULL THEN
        -- Update the referred user's profile
        UPDATE public.profiles 
        SET referred_by = referrer_user_id 
        WHERE user_id = referred_user_id;
        
        -- Create referral record
        INSERT INTO public.referrals (
            referrer_id,
            referred_id,
            referral_code,
            status
        ) VALUES (
            referrer_user_id,
            referred_user_id,
            '9079C8',
            'active'
        ) ON CONFLICT DO NOTHING;
        
        -- Update referrer's count
        UPDATE public.profiles 
        SET total_referrals = total_referrals + 1 
        WHERE user_id = referrer_user_id;
        
        RAISE NOTICE 'Referral applied successfully!';
    ELSE
        RAISE NOTICE 'Could not find users. Referred: %, Referrer: %', referred_user_id, referrer_user_id;
    END IF;
END $$;

-- 4. Verify the referral was applied
SELECT 'Verification:' as info;
SELECT 
    p.email,
    p.referral_code,
    p.referred_by,
    p.total_referrals,
    referrer.email as referred_by_email
FROM public.profiles p
LEFT JOIN public.profiles referrer ON p.referred_by = referrer.user_id
WHERE p.email IN ('test2@gmail.com', 'test@gmail.com')
   OR p.referral_code = '9079C8';

-- 5. Check referrals table
SELECT 'Referrals table:' as info;
SELECT 
    r.*,
    referrer.email as referrer_email,
    referred.email as referred_email
FROM public.referrals r
LEFT JOIN public.profiles referrer ON r.referrer_id = referrer.user_id
LEFT JOIN public.profiles referred ON r.referred_id = referred.user_id;
