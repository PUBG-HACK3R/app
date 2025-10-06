-- Create sample mining plans with integer IDs
-- Make sure to run this in your Supabase SQL Editor

-- First, let's check the current structure and clear existing plans
DELETE FROM public.plans;

-- Insert sample Bitcoin mining plans with integer IDs
INSERT INTO public.plans (name, min_amount, roi_daily_percent, duration_days, is_active) VALUES
('Micro Bitcoin Miner', 50, 2.0, 7, true),
('Basic Bitcoin Miner', 100, 2.0, 10, true),
('Advanced Bitcoin Miner', 500, 2.5, 25, true),
('Bitcoin Pro Miner', 1000, 3.0, 35, true),
('Bitcoin Enterprise Farm', 2500, 6.0, 60, true);

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
