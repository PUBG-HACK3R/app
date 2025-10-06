-- Simple insert for plans table with only known columns
-- Clear existing plans first
DELETE FROM public.plans;

-- Insert sample Bitcoin mining plans with minimal required columns
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
('Micro Bitcoin Miner', 50.00, 500.00, 2.0, 7, 'ASIC Mining', '10 TH/s', '1000W', 'Low', true),
('Basic Bitcoin Miner', 100.00, 1000.00, 2.0, 10, 'ASIC Mining', '50 TH/s', '3000W', 'Low', true),
('Advanced Bitcoin Miner', 500.00, 5000.00, 2.5, 25, 'ASIC Mining', '100 TH/s', '5000W', 'Medium', true),
('Bitcoin Pro Miner', 1000.00, 10000.00, 3.0, 35, 'ASIC Mining', '200 TH/s', '8000W', 'Medium', true),
('Bitcoin Enterprise Farm', 2500.00, 25000.00, 6.0, 60, 'ASIC Farm', '1000 TH/s', '50000W', 'High', true);

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
