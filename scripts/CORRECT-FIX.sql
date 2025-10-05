-- THE CORRECT FIX - Replace the wrong function with the right one
-- Your current function has wrong signature - it expects 6 parameters as INPUT
-- It should be a GENERATOR that takes 2 parameters and CREATES addresses

-- Drop the wrong function
DROP FUNCTION generate_user_deposit_address;

-- Create the CORRECT function that matches your API call
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID, network_type TEXT)
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER, network TEXT) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
    new_derivation_path TEXT;
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
        new_address := 'T' || upper(substring(encode(digest('tron_' || next_index::text, 'sha256'), 'hex'), 1, 33));
        new_derivation_path := 'm/44''/195''/0''/0/' || next_index;
    ELSIF network_type = 'arbitrum' THEN
        new_address := '0x' || substring(encode(digest('arb_' || next_index::text, 'sha256'), 'hex'), 1, 40);
        new_derivation_path := 'm/44''/60''/0''/0/' || next_index;
    ELSE
        RAISE EXCEPTION 'Unsupported network: %', network_type;
    END IF;
    
    -- Insert the new address
    INSERT INTO user_deposit_addresses (
        user_id, deposit_address, derivation_path, address_index, network, is_active, created_at
    ) VALUES (
        user_uuid, new_address, new_derivation_path, next_index, network_type, true, NOW()
    );
    
    -- Return the generated data
    RETURN QUERY SELECT new_address, new_derivation_path, next_index, network_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID, TEXT) TO service_role;
