-- Create sample mining plans for testing
-- Make sure to run this in your Supabase SQL Editor

-- First, let's check if plans table exists and has the right structure
-- If min_amount column doesn't exist, we need to add it
DO $$ BEGIN
  ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS min_amount numeric(12,2);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Update existing price_usdt column to min_amount if needed
DO $$ BEGIN
  UPDATE public.plans SET min_amount = price_usdt WHERE min_amount IS NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Clear existing plans (optional - remove this line if you want to keep existing plans)
DELETE FROM public.plans;

-- Insert sample Bitcoin mining plans
INSERT INTO public.plans (id, name, min_amount, roi_daily_percent, duration_days, is_active) VALUES
(gen_random_uuid(), 'Micro Bitcoin Miner', 50, 2.0, 7, true),
(gen_random_uuid(), 'Basic Bitcoin Miner', 100, 2.0, 10, true),
(gen_random_uuid(), 'Advanced Bitcoin Miner', 500, 2.5, 25, true),
(gen_random_uuid(), 'Bitcoin Pro Miner', 1000, 3.0, 35, true),
(gen_random_uuid(), 'Bitcoin Enterprise Farm', 2500, 6.0, 60, true)
ON CONFLICT (id) DO NOTHING;

-- Verify the plans were created
SELECT 
  id,
  name,
  min_amount,
  roi_daily_percent,
  duration_days,
  is_active,
  created_at
FROM public.plans 
WHERE is_active = true 
ORDER BY min_amount;
