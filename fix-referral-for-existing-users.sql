-- CORRECT FIX: Add referral system to existing authenticated users
-- This works with your existing auth users and profiles

-- 1. Add referral columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC(12,2) DEFAULT 0;

-- 2. Create referral code generation function
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

-- 3. Generate referral codes for ALL existing users
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 4. Set specific referral codes for testing (if users exist)
-- Update existing users with the codes you want to test
UPDATE public.profiles 
SET referral_code = 'F0BB72'
WHERE email = (SELECT email FROM public.profiles LIMIT 1)
AND referral_code IS NOT NULL;

-- If you have specific users, update them:
-- UPDATE public.profiles SET referral_code = 'F0BB72' WHERE email = 'your-email@example.com';
-- UPDATE public.profiles SET referral_code = '9079C8' WHERE email = 'another-email@example.com';
-- UPDATE public.profiles SET referral_code = '1C8295' WHERE email = 'third-email@example.com';

-- 5. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(referrer_id, referred_id)
);

-- 6. Create referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
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

-- 7. Create auto-generation trigger for new users
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);

-- 9. Enable RLS and create policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals for themselves" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.referral_commissions;

-- Create RLS policies
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users can insert referrals for themselves" ON public.referrals
  FOR INSERT WITH CHECK (referred_id = auth.uid());

CREATE POLICY "Users can view their own commissions" ON public.referral_commissions
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT ON public.referral_commissions TO authenticated;

-- 11. Verify the setup
SELECT 'Referral system setup complete!' as status;
SELECT email, referral_code FROM public.profiles WHERE referral_code IS NOT NULL LIMIT 5;
