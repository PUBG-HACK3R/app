-- Debug script to check subscriptions and related data
-- Run this in Supabase SQL Editor to debug the plan purchase issue

-- 1. Check if subscriptions table exists and has data
SELECT 'Subscriptions table data:' as info;
SELECT 
  id, 
  user_id, 
  plan_id, 
  principal_usdt, 
  active, 
  start_date, 
  end_date,
  created_at
FROM public.subscriptions 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check if plans table has data
SELECT 'Plans table data:' as info;
SELECT id, name, price_usdt, is_active FROM public.plans ORDER BY created_at DESC;

-- 3. Check transaction types enum
SELECT 'Current transaction types:' as info;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.tx_type'::regtype ORDER BY enumsortorder;

-- 4. Check recent transactions
SELECT 'Recent transactions:' as info;
SELECT 
  id, 
  user_id, 
  type, 
  amount_usdt, 
  reference_id, 
  meta,
  created_at
FROM public.transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check for failed investment transactions (should show errors if enum is missing 'investment')
SELECT 'Check for investment transactions:' as info;
SELECT COUNT(*) as investment_count FROM public.transactions WHERE type = 'investment';

-- 6. Check profiles table
SELECT 'Profiles count:' as info;
SELECT COUNT(*) as profile_count FROM public.profiles;
