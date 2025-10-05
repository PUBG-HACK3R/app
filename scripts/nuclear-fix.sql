-- Nuclear Fix - Complete reset of deposit address functions
-- Use this if the simple fix doesn't work

-- Step 1: Drop everything and start fresh
DROP FUNCTION IF EXISTS generate_user_deposit_address(UUID);
DROP FUNCTION IF EXISTS generate_user_deposit_address(UUID, TEXT);

-- Step 2: Recreate the function from scratch
CREATE FUNCTION generate_user_deposit_address(user_uuid UUID, network_type TEXT DEFAULT 'trc20')
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER, network TEXT) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
    derivation_path TEXT;
BEGIN
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
        new_address := 'T' || upper(substring(encode(digest('tron_seed_' || next_index::text, 'sha256'), 'hex'), 1, 33));
        derivation_path := 'm/44''/195''/0''/0/' || next_index;
    ELSIF network_type = 'arbitrum' THEN
        new_address := '0x' || substring(encode(digest('arb_seed_' || next_index::text, 'sha256'), 'hex'), 1, 40);
        derivation_path := 'm/44''/60''/0''/0/' || next_index;
    ELSE
        RAISE EXCEPTION 'Unsupported network: %', network_type;
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
        derivation_path, 
        next_index, 
        network_type,
        true,
        NOW()
    );
    
    RETURN QUERY SELECT new_address, derivation_path, next_index, network_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID, TEXT) TO service_role;

-- Analyze tables (VACUUM removed as it can't run in transaction)
ANALYZE user_deposit_addresses;
ANALYZE centralized_withdrawals;

SELECT 'Nuclear fix complete - ARB should work now!' as status;
