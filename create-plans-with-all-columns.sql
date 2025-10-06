-- Create sample mining plans with all required columns
-- First, let's see what columns exist in the plans table
-- Run this to check the structure:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'plans';

-- Clear existing plans
DELETE FROM public.plans;

-- Insert sample Bitcoin mining plans with all required columns
INSERT INTO public.plans (
  name, 
  min_amount, 
  max_amount,
  roi_daily_percent, 
  duration_days, 
  mining_type,
  hash_rate,
  power_consumption,
  risk_level,
  is_active
) VALUES
('Micro Bitcoin Miner', 50, 500, 2.0, 7, 'ASIC Mining', '10 TH/s', '1000W', 'Low', true),
('Basic Bitcoin Miner', 100, 1000, 2.0, 10, 'ASIC Mining', '50 TH/s', '3000W', 'Low', true),
('Advanced Bitcoin Miner', 500, 5000, 2.5, 25, 'ASIC Mining', '100 TH/s', '5000W', 'Medium', true),
('Bitcoin Pro Miner', 1000, 10000, 3.0, 35, 'ASIC Mining', '200 TH/s', '8000W', 'Medium', true),
('Bitcoin Enterprise Farm', 2500, 25000, 6.0, 60, 'ASIC Farm', '1000 TH/s', '50000W', 'High', true);

-- Verify the plans were created
SELECT 
  id,
  name,
  min_amount,
  max_amount,
  roi_daily_percent,
  duration_days,
  mining_type,
  hash_rate,
  power_consumption,
  risk_level,
  is_active
FROM public.plans 
WHERE is_active = true 
ORDER BY min_amount;
