-- Fix Function Conflicts and Column Ambiguity Issues
-- This script resolves the specific errors found in the debug output

-- Step 1: Drop all existing conflicting functions
DROP FUNCTION IF EXISTS generate_user_deposit_address(UUID);
DROP FUNCTION IF EXISTS generate_user_deposit_address(UUID, TEXT);
DROP FUNCTION IF EXISTS get_next_address_index();
DROP FUNCTION IF EXISTS get_next_address_index(TEXT);

-- Step 2: Update existing network values from 'tron' to 'trc20'
UPDATE user_deposit_addresses SET network = 'trc20' WHERE network = 'tron';
UPDATE user_deposit_addresses SET network = 'trc20' WHERE network = 'polygon';

-- Step 3: Create a clean, non-ambiguous function for getting next index
CREATE OR REPLACE FUNCTION get_next_address_index_for_network(network_type TEXT DEFAULT 'trc20')
RETURNS INTEGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    SELECT COALESCE(MAX(uda.address_index), -1) + 1 
    INTO next_index 
    FROM user_deposit_addresses uda
    WHERE uda.network = network_type;
    
    -- If no addresses exist for this network, start from 0
    IF next_index IS NULL THEN
        next_index := 0;
    END IF;
    
    RETURN next_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the main function with explicit table aliases to avoid ambiguity
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID, network_type TEXT DEFAULT 'trc20')
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER, network TEXT) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
    new_derivation_path TEXT;
    coin_type INTEGER;
BEGIN
    -- Validate network type
    IF network_type NOT IN ('trc20', 'arbitrum') THEN
        RAISE EXCEPTION 'Unsupported network type: %. Supported networks: trc20, arbitrum', network_type;
    END IF;
    
    -- Get next available index for this network using our new function
    next_index := get_next_address_index_for_network(network_type);
    
    -- Generate address based on network type
    IF network_type = 'trc20' THEN
        coin_type := 195; -- TRON's coin type
        new_derivation_path := 'm/44''/' || coin_type || '''/0''/0/' || next_index::text;
        new_address := generate_tron_address(next_index);
    ELSIF network_type = 'arbitrum' THEN
        coin_type := 60; -- Ethereum's coin type (Arbitrum uses same)
        new_derivation_path := 'm/44''/' || coin_type || '''/0''/0/' || next_index::text;
        new_address := generate_arbitrum_address(next_index);
    END IF;
    
    -- Insert the new address with explicit column names
    INSERT INTO user_deposit_addresses (
        user_id, 
        deposit_address, 
        derivation_path, 
        address_index, 
        network,
        is_active
    ) VALUES (
        user_uuid, 
        new_address, 
        new_derivation_path, 
        next_index, 
        network_type,
        true
    );
    
    -- Return the result
    RETURN QUERY SELECT new_address, new_derivation_path, next_index, network_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create backward compatibility function (single parameter)
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID)
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER) AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Call the new function with default network
    FOR result_record IN 
        SELECT * FROM generate_user_deposit_address(user_uuid, 'trc20')
    LOOP
        RETURN QUERY SELECT result_record.address, result_record.derivation_path, result_record.address_index;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Ensure the address generation functions exist
CREATE OR REPLACE FUNCTION generate_tron_address(address_index INTEGER)
RETURNS TEXT AS $$
DECLARE
    base_hash TEXT;
    tron_address TEXT;
BEGIN
    -- This is a simplified version - in production, use proper TRON address derivation
    base_hash := encode(digest('tron_master_seed_' || address_index::text, 'sha256'), 'hex');
    
    -- TRON addresses start with 'T' and are base58 encoded
    -- This is a mock implementation - use proper TRON address generation in production
    tron_address := 'T' || substring(base_hash, 1, 33);
    
    RETURN tron_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_arbitrum_address(address_index INTEGER)
RETURNS TEXT AS $$
DECLARE
    base_hash TEXT;
    eth_address TEXT;
BEGIN
    -- This is a simplified version - in production, use proper Ethereum address derivation
    base_hash := encode(digest('arbitrum_master_seed_' || address_index::text, 'sha256'), 'hex');
    
    -- Ethereum addresses start with '0x' and are 40 hex characters
    eth_address := '0x' || substring(base_hash, 1, 40);
    
    RETURN eth_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_next_address_index_for_network(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION generate_tron_address(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION generate_arbitrum_address(INTEGER) TO service_role;

-- Step 8: Test the functions (this should work now)
-- SELECT * FROM generate_user_deposit_address('a1dbdb83-f77b-4c02-a578-f0c0141bfa1e'::UUID, 'trc20');

COMMENT ON FUNCTION generate_user_deposit_address(UUID, TEXT) IS 'Fixed function that generates unique deposit addresses without column ambiguity';
COMMENT ON FUNCTION get_next_address_index_for_network(TEXT) IS 'Helper function to get next address index for a specific network without ambiguity';
