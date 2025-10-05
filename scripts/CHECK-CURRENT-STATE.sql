-- Check what's the current state after running the fix

-- 1. What function exists now?
SELECT 
    r.routine_name,
    COALESCE(
        string_agg(
            COALESCE(p.parameter_name, 'no_name') || ':' || COALESCE(p.data_type, 'no_type'), 
            ', ' ORDER BY p.ordinal_position
        ), 
        'NO PARAMETERS'
    ) as current_signature
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name = 'generate_user_deposit_address'
GROUP BY r.routine_name, r.specific_name;

-- 2. Test the exact API call again
DO $$
BEGIN
    PERFORM generate_user_deposit_address('00000000-0000-0000-0000-000000000001'::UUID, 'arbitrum');
    RAISE NOTICE 'SUCCESS: Function works now!';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'STILL ERROR: % | CODE: %', SQLERRM, SQLSTATE;
END $$;
