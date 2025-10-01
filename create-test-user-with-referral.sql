-- EMERGENCY FIX: Create test user with referral code F0BB72
-- Run this in Supabase SQL Editor RIGHT NOW

-- First, add referral columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC(12,2) DEFAULT 0;

-- Create a test user profile with the referral code you're trying to use
INSERT INTO public.profiles (
  user_id,
  email,
  role,
  referral_code,
  total_referrals,
  total_referral_earnings,
  created_at
) VALUES (
  gen_random_uuid(),
  'testuser@example.com',
  'user',
  'F0BB72',
  0,
  0,
  NOW()
) ON CONFLICT (referral_code) DO NOTHING;

-- Also create users with the other codes you've been testing
INSERT INTO public.profiles (
  user_id,
  email,
  role,
  referral_code,
  total_referrals,
  total_referral_earnings,
  created_at
) VALUES 
(
  gen_random_uuid(),
  'testuser2@example.com',
  'user',
  '9079C8',
  0,
  0,
  NOW()
),
(
  gen_random_uuid(),
  'testuser3@example.com',
  'user',
  '1C8295',
  0,
  0,
  NOW()
) ON CONFLICT (referral_code) DO NOTHING;

-- Verify the users were created
SELECT email, referral_code FROM public.profiles WHERE referral_code IN ('F0BB72', '9079C8', '1C8295');
