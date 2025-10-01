-- Create referral system tables
-- Run this in your Supabase SQL editor

-- Add referral columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC(12,2) DEFAULT 0;

-- Create referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(referrer_id, referred_id)
);

-- Create referral_commissions table to track earnings
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

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  code VARCHAR(10);
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) 
        FROM 1 FOR 6
      )
    );
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.profiles 
    WHERE referral_code = code;
    
    -- Exit loop if code is unique
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate referral code for new users
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

-- Create trigger to auto-generate referral codes
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Function to handle referral commissions
CREATE OR REPLACE FUNCTION process_referral_commission(
  p_referred_user_id UUID,
  p_transaction_id UUID,
  p_source_amount NUMERIC,
  p_source_type VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_commission_amount NUMERIC;
  v_commission_rate NUMERIC := 10.00; -- 10% commission
BEGIN
  -- Get referrer information
  SELECT referred_by INTO v_referrer_id
  FROM public.profiles
  WHERE user_id = p_referred_user_id
  AND referred_by IS NOT NULL;
  
  -- If user has a referrer, calculate and record commission
  IF v_referrer_id IS NOT NULL THEN
    v_commission_amount := (p_source_amount * v_commission_rate / 100);
    
    -- Insert commission record
    INSERT INTO public.referral_commissions (
      referrer_id,
      referred_id,
      transaction_id,
      commission_amount,
      commission_percentage,
      source_amount,
      source_type,
      status
    ) VALUES (
      v_referrer_id,
      p_referred_user_id,
      p_transaction_id,
      v_commission_amount,
      v_commission_rate,
      p_source_amount,
      p_source_type,
      'pending'
    );
    
    -- Update referrer's total earnings (for quick access)
    UPDATE public.profiles
    SET total_referral_earnings = total_referral_earnings + v_commission_amount
    WHERE user_id = v_referrer_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing users to have referral codes
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred_id ON public.referral_commissions(referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Enable RLS (Row Level Security)
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (
    referrer_id = auth.uid() OR 
    referred_id = auth.uid()
  );

CREATE POLICY "Users can insert referrals for themselves" ON public.referrals
  FOR INSERT WITH CHECK (referred_id = auth.uid());

-- RLS Policies for referral_commissions table  
CREATE POLICY "Users can view their own commissions" ON public.referral_commissions
  FOR SELECT USING (
    referrer_id = auth.uid() OR 
    referred_id = auth.uid()
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Referral system setup complete!
-- Commission rate set to 10%
-- All existing users now have referral codes
