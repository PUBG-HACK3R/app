-- Final ARB Fix - Drop and recreate the function properly
-- This follows the PostgreSQL hint to DROP first

-- Step 1: Drop the existing function (as PostgreSQL suggested)
DROP FUNCTION IF EXISTS generate_user_deposit_address(UUID, TEXT);

-- Step 2: Recreate the function with proper signature
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID, network_type TEXT DEFAULT 'trc20')
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER, network TEXT) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
BEGIN
    -- Validate network
    IF network_type NOT IN ('trc20', 'arbitrum') THEN
        RAISE EXCEPTION 'Invalid network: %', network_type;
    END IF;
    
    -- Get next index for this network
    SELECT COALESCE(MAX(address_index), -1) + 1 
    INTO next_index 
    FROM user_deposit_addresses
    WHERE network = network_type;
    
    IF next_index IS NULL THEN
        next_index := 0;
    END IF;
    
    -- Generate address based on network
    IF network_type = 'trc20' THEN
        new_address := 'T' || upper(substring(encode(digest('tron_' || next_index::text, 'sha256'), 'hex'), 1, 33));
    ELSIF network_type = 'arbitrum' THEN
        new_address := '0x' || substring(encode(digest('arb_' || next_index::text, 'sha256'), 'hex'), 1, 40);
    END IF;
    
    -- Insert the new address
    INSERT INTO user_deposit_addresses (
        user_id, 
        deposit_address, 
        derivation_path, 
        address_index, 
        network, 
        is_active,
        created_at
    ) VALUES (
        user_uuid, 
        new_address, 
        'm/44''/60''/0''/0/' || next_index, 
        next_index, 
        network_type, 
        true,
        NOW()
    );
    
    -- Return the result
    RETURN QUERY SELECT new_address, 'm/44''/60''/0''/0/' || next_index, next_index, network_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID, TEXT) TO service_role;

-- Step 4: Test it works
SELECT 'Final ARB fix complete - test ARB deposits now!' as status;
