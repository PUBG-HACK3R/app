-- Debug ARB Issue - Find out exactly what's wrong

-- Test 1: Check what functions exist
SELECT 
    r.routine_name,
    array_agg(p.parameter_name || ' ' || p.data_type ORDER BY p.ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name = 'generate_user_deposit_address'
GROUP BY r.routine_name;

-- Test 2: Try calling the function directly and see the error
DO $$
BEGIN
    PERFORM generate_user_deposit_address('00000000-0000-0000-0000-000000000001'::UUID, 'arbitrum');
    RAISE NOTICE 'SUCCESS: ARB function works!';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;

-- Test 3: Check if table exists and has correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_deposit_addresses' 
ORDER BY ordinal_position;

-- Test 4: Check existing addresses
SELECT network, COUNT(*) as count FROM user_deposit_addresses GROUP BY network;
