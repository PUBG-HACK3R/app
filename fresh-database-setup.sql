-- NUCLEAR OPTION: Complete fresh database setup for EarningWe
-- This will reset and recreate everything from scratch
-- Run this in your PRODUCTION Supabase SQL Editor

-- 1. DROP ALL EXISTING REFERRAL TABLES (if they exist)
DROP TABLE IF EXISTS public.referral_commissions CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;

-- 2. DROP ALL REFERRAL FUNCTIONS (if they exist)
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.auto_generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.process_referral_commission(UUID, UUID, NUMERIC, VARCHAR) CASCADE;

-- 3. REMOVE REFERRAL COLUMNS FROM PROFILES (if they exist)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS referral_code CASCADE,
DROP COLUMN IF EXISTS referred_by CASCADE,
DROP COLUMN IF EXISTS total_referrals CASCADE,
DROP COLUMN IF EXISTS total_referral_earnings CASCADE;

-- 4. ADD REFERRAL COLUMNS FRESH
ALTER TABLE public.profiles 
ADD COLUMN referral_code VARCHAR(10) UNIQUE,
ADD COLUMN referred_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN total_referrals INTEGER DEFAULT 0,
ADD COLUMN total_referral_earnings NUMERIC(12,2) DEFAULT 0;

-- 5. CREATE REFERRALS TABLE
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(referrer_id, referred_id)
);

-- 6. CREATE REFERRAL COMMISSIONS TABLE
CREATE TABLE public.referral_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  commission_amount NUMERIC(12,2) NOT NULL,
  commission_percentage NUMERIC(5,2) DEFAULT 10.00,
  source_amount NUMERIC(12,2) NOT NULL,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('deposit', 'earning')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled'))
);

-- 7. CREATE REFERRAL CODE GENERATION FUNCTION
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  code VARCHAR(10);
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check FROM public.profiles WHERE referral_code = code;
    
    -- Exit loop if code is unique
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 8. CREATE AUTO-GENERATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if referral_code is null
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE TRIGGER FOR NEW USERS
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- 10. GENERATE REFERRAL CODES FOR ALL EXISTING USERS
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 11. CREATE SPECIFIC TEST USERS WITH YOUR CODES
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
  'testuser-f0bb72@example.com',
  'user',
  'F0BB72',
  0,
  0,
  NOW()
),
(
  gen_random_uuid(),
  'testuser-9079c8@example.com',
  'user',
  '9079C8',
  0,
  0,
  NOW()
),
(
  gen_random_uuid(),
  'testuser-1c8295@example.com',
  'user',
  '1C8295',
  0,
  0,
  NOW()
) ON CONFLICT (referral_code) DO NOTHING;

-- 12. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred_id ON public.referral_commissions(referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 13. ENABLE RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- 14. DROP EXISTING POLICIES
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals for themselves" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.referral_commissions;

-- 15. CREATE RLS POLICIES
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (
    referrer_id = auth.uid() OR 
    referred_id = auth.uid()
  );

CREATE POLICY "Users can insert referrals for themselves" ON public.referrals
  FOR INSERT WITH CHECK (referred_id = auth.uid());

CREATE POLICY "Users can view their own commissions" ON public.referral_commissions
  FOR SELECT USING (
    referrer_id = auth.uid() OR 
    referred_id = auth.uid()
  );

-- 16. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 17. VERIFY SETUP
SELECT 'Setup Complete!' as status;
SELECT email, referral_code FROM public.profiles WHERE referral_code IN ('F0BB72', '9079C8', '1C8295');
SELECT COUNT(*) as total_users_with_codes FROM public.profiles WHERE referral_code IS NOT NULL;
