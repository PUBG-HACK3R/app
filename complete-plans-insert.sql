-- Complete insert for plans table with all columns
-- Clear existing plans first
DELETE FROM public.plans;

-- Insert sample Bitcoin mining plans with all columns filled
INSERT INTO public.plans (
  name, 
  price_usdt,
  min_amount, 
  max_amount,
  roi_daily_percent, 
  duration_days,
  description,
  mining_type,
  hash_rate,
  power_consumption,
  risk_level,
  features,
  is_active
) VALUES
('Micro Bitcoin Miner', 50.00, 50.00, 500.00, 2.0, 7, 'Perfect starter plan for new miners', 'ASIC Mining', '10 TH/s', '1000W', 'Low', 'Shared ASIC Mining,Daily Payouts,24/7 Support', true),
('Basic Bitcoin Miner', 100.00, 100.00, 1000.00, 2.0, 10, 'Popular choice for beginners', 'ASIC Mining', '50 TH/s', '3000W', 'Low', 'Dedicated Mining,Real-time Stats,Daily Rewards', true),
('Advanced Bitcoin Miner', 500.00, 500.00, 5000.00, 2.5, 25, 'Professional mining with latest hardware', 'ASIC Mining', '100 TH/s', '5000W', 'Medium', 'ASIC S19 Mining,Priority Support,Advanced Analytics', true),
('Bitcoin Pro Miner', 1000.00, 1000.00, 10000.00, 3.0, 35, 'Professional Bitcoin mining operation', 'ASIC Mining', '200 TH/s', '8000W', 'Medium', 'ASIC S19 Pro,Advanced Cooling,Priority Support', true),
('Bitcoin Enterprise Farm', 2500.00, 2500.00, 25000.00, 6.0, 60, 'Large-scale Bitcoin mining farm', 'ASIC Farm', '1000 TH/s', '50000W', 'High', 'Industrial ASIC Farm,Renewable Energy,Dedicated Support', true);

-- Verify the plans were created
SELECT 
  id,
  name,
  min_amount,
  max_amount,
  roi_daily_percent,
  duration_days,
  is_active
FROM public.plans 
WHERE is_active = true 
ORDER BY min_amount;
