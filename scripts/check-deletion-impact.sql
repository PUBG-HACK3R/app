-- Check Impact of Deleted Withdrawal Record
-- This will help us understand what broke after the deletion

-- Check 1: Verify table integrity
SELECT 'Checking centralized_withdrawals table...' as step;
SELECT 
    COUNT(*) as total_withdrawals,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM centralized_withdrawals;

-- Check 2: Look for any constraint violations or orphaned records
SELECT 'Checking for constraint violations...' as step;
SELECT 
    cw.id,
    cw.user_id,
    cw.status,
    CASE WHEN p.id IS NULL THEN 'ORPHANED USER' ELSE 'OK' END as user_status
FROM centralized_withdrawals cw
LEFT JOIN profiles p ON cw.user_id = p.id
WHERE p.id IS NULL;

-- Check 3: Check if user_deposit_addresses table is affected
SELECT 'Checking user_deposit_addresses table...' as step;
SELECT 
    network,
    COUNT(*) as address_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM user_deposit_addresses
GROUP BY network;

-- Check 4: Test the deposit address function directly
SELECT 'Testing deposit address functions...' as step;

-- Test TRC20 function
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Try to generate a TRC20 address
    SELECT * INTO test_result 
    FROM generate_user_deposit_address(
        '00000000-0000-0000-0000-000000000001'::UUID, 
        'trc20'
    );
    RAISE NOTICE 'TRC20 function works: address=%, network=%', test_result.address, test_result.network;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'TRC20 function ERROR: %', SQLERRM;
END $$;

-- Test Arbitrum function
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Try to generate an Arbitrum address
    SELECT * INTO test_result 
    FROM generate_user_deposit_address(
        '00000000-0000-0000-0000-000000000002'::UUID, 
        'arbitrum'
    );
    RAISE NOTICE 'Arbitrum function works: address=%, network=%', test_result.address, test_result.network;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Arbitrum function ERROR: %', SQLERRM;
END $$;

-- Check 5: Look for any database errors or locks
SELECT 'Checking for database issues...' as step;
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('user_deposit_addresses', 'centralized_withdrawals')
ORDER BY tablename, attname;

-- Check 6: Verify indexes are working
SELECT 'Checking database indexes...' as step;
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('user_deposit_addresses', 'centralized_withdrawals')
ORDER BY tablename, indexname;

SELECT 'Diagnostic complete!' as final_status;
