-- Check what deposit-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%deposit%';

-- Check deposit_monitoring table structure if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'deposit_monitoring' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_deposit_addresses table structure if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_deposit_addresses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
