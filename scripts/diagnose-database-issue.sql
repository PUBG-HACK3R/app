-- Diagnostic script to check current database state
-- Run this to see what's actually in your database

-- Check if user_deposit_addresses table exists and its structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_deposit_addresses' 
ORDER BY ordinal_position;

-- Check existing functions related to deposit addresses
SELECT routine_name, routine_type, specific_name, data_type, type_udt_name
FROM information_schema.routines 
WHERE routine_name LIKE '%deposit_address%' OR routine_name LIKE '%generate_user%';

-- Check function parameters
SELECT 
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode,
    p.ordinal_position
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name LIKE '%generate_user_deposit_address%'
ORDER BY r.routine_name, p.ordinal_position;

-- Check existing wallet config
SELECT * FROM wallet_config WHERE config_key LIKE '%network%' OR config_key LIKE '%trc20%' OR config_key LIKE '%arbitrum%';

-- Check existing user deposit addresses
SELECT user_id, deposit_address, network, derivation_path, address_index, created_at 
FROM user_deposit_addresses 
LIMIT 5;
