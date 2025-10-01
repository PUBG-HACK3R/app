-- Fix plans table schema and transaction types
-- Run this in Supabase SQL Editor to fix the issues

-- 1. Add missing 'investment' type to tx_type enum
ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'investment';

-- 2. Add missing 'description' column to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description text;

-- 3. Update existing plans to have a description if they don't have one
UPDATE public.plans 
SET description = CASE 
  WHEN name ILIKE '%starter%' THEN 'Perfect for beginners looking to start their investment journey'
  WHEN name ILIKE '%basic%' THEN 'Ideal for new investors seeking steady returns'
  WHEN name ILIKE '%standard%' THEN 'Great balance of risk and reward for regular investors'
  WHEN name ILIKE '%premium%' THEN 'Higher returns for experienced investors'
  WHEN name ILIKE '%pro%' THEN 'Professional-grade investment plan with maximum returns'
  WHEN name ILIKE '%vip%' THEN 'Exclusive plan for high-value investors'
  ELSE 'Investment plan with competitive returns and secure growth'
END
WHERE description IS NULL OR description = '';

-- 4. Make description NOT NULL after setting default values
ALTER TABLE public.plans ALTER COLUMN description SET NOT NULL;

-- 5. Verify the changes
SELECT 'Plans table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'plans' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Transaction types:' as info;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.tx_type'::regtype ORDER BY enumsortorder;

SELECT 'Sample plans data:' as info;
SELECT id, name, description, price_usdt, is_active FROM public.plans LIMIT 5;
