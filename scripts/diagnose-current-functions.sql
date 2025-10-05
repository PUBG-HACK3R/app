-- Diagnose Current Database Function Status
-- Run this in Supabase to see what functions currently exist

-- Check 1: What versions of generate_user_deposit_address exist?
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    array_agg(
        CASE 
            WHEN parameter_name IS NOT NULL 
            THEN parameter_name || ' ' || data_type 
            ELSE 'no parameters' 
        END
        ORDER BY ordinal_position
    ) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name = 'generate_user_deposit_address'
GROUP BY routine_name, routine_type, r.data_type
ORDER BY routine_name;

-- Check 2: Do the helper functions exist?
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'get_next_address_index_for_network',
    'generate_tron_address', 
    'generate_arbitrum_address'
)
ORDER BY routine_name;

-- Check 3: What networks exist in user_deposit_addresses?
SELECT 
    network,
    COUNT(*) as address_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM user_deposit_addresses
GROUP BY network
ORDER BY network;

-- Check 4: Test if the multi-network function works
-- (This will show the exact error if it fails)
DO $$
BEGIN
    -- Try to call the function with arbitrum parameter
    PERFORM generate_user_deposit_address(
        '00000000-0000-0000-0000-000000000001'::UUID, 
        'arbitrum'
    );
    RAISE NOTICE 'SUCCESS: Multi-network function exists and works';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Multi-network function failed: %', SQLERRM;
END $$;

-- Check 5: Test if single-parameter function works
DO $$
BEGIN
    -- Try to call the function with single parameter
    PERFORM generate_user_deposit_address(
        '00000000-0000-0000-0000-000000000002'::UUID
    );
    RAISE NOTICE 'SUCCESS: Single-parameter function exists and works';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Single-parameter function failed: %', SQLERRM;
END $$;

-- Summary message
SELECT 'Diagnostic complete - check the results above to see what functions exist' as status;
