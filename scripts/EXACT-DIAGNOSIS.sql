-- EXACT DIAGNOSIS - Find the real problem
-- Run this and tell me the EXACT output

-- 1. What functions exist with what parameters?
SELECT 
    r.routine_name,
    r.routine_type,
    COALESCE(
        string_agg(
            COALESCE(p.parameter_name, 'no_name') || ':' || COALESCE(p.data_type, 'no_type'), 
            ', ' ORDER BY p.ordinal_position
        ), 
        'NO PARAMETERS'
    ) as function_signature
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name = 'generate_user_deposit_address'
GROUP BY r.routine_name, r.routine_type, r.specific_name
ORDER BY r.routine_name;

-- 2. Test the EXACT call your API makes
DO $$
BEGIN
    -- This is EXACTLY what your API calls
    PERFORM generate_user_deposit_address(
        user_uuid := '00000000-0000-0000-0000-000000000001'::UUID,
        network_type := 'arbitrum'
    );
    RAISE NOTICE 'SUCCESS: API call works perfectly!';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'EXACT ERROR: % | DETAIL: % | HINT: %', SQLERRM, SQLSTATE, SQLERRM;
END $$;

-- 3. Test TRC20 call
DO $$
BEGIN
    PERFORM generate_user_deposit_address(
        user_uuid := '00000000-0000-0000-0000-000000000002'::UUID,
        network_type := 'trc20'
    );
    RAISE NOTICE 'TRC20 SUCCESS: Works fine';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'TRC20 ERROR: %', SQLERRM;
END $$;
