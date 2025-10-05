-- Minimal ARB Fix - Just add the missing function without breaking anything

-- Create the multi-network function (this is what's missing)
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID, network_type TEXT)
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER, network TEXT) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
BEGIN
    -- Get next index
    SELECT COALESCE(MAX(address_index), -1) + 1 
    INTO next_index 
    FROM user_deposit_addresses
    WHERE network = network_type;
    
    IF next_index IS NULL THEN
        next_index := 0;
    END IF;
    
    -- Generate address
    IF network_type = 'trc20' THEN
        new_address := 'T' || upper(substring(encode(digest('tron_' || next_index::text, 'sha256'), 'hex'), 1, 33));
    ELSE
        new_address := '0x' || substring(encode(digest('arb_' || next_index::text, 'sha256'), 'hex'), 1, 40);
    END IF;
    
    -- Insert address
    INSERT INTO user_deposit_addresses (user_id, deposit_address, derivation_path, address_index, network, is_active) 
    VALUES (user_uuid, new_address, 'm/44''/60''/0''/0/' || next_index, next_index, network_type, true);
    
    RETURN QUERY SELECT new_address, 'm/44''/60''/0''/0/' || next_index, next_index, network_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID, TEXT) TO service_role;
