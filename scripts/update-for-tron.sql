-- Update the centralized wallet system for TRON TRC20

-- Update wallet config for TRON
UPDATE wallet_config SET config_value = 'tron' WHERE config_key = 'network';
UPDATE wallet_config SET config_value = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' WHERE config_key = 'usdt_contract_address';

-- Add TRON-specific config
INSERT INTO wallet_config (config_key, config_value, description) VALUES
('tron_api_key', '', 'TronGrid API key for better rate limits (optional)'),
('tron_full_node', 'https://api.trongrid.io', 'TRON full node URL')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- Function to generate TRON address (simplified version)
CREATE OR REPLACE FUNCTION generate_tron_address(address_index INTEGER)
RETURNS TEXT AS $$
DECLARE
    base_hash TEXT;
    tron_address TEXT;
BEGIN
    -- This is a simplified version - in production, use proper TRON address derivation
    -- For now, we'll create deterministic addresses based on index
    base_hash := encode(digest('tron_master_seed_' || address_index::text, 'sha256'), 'hex');
    
    -- TRON addresses start with 'T' and are base58 encoded
    -- This is a mock implementation - use proper TRON address generation in production
    tron_address := 'T' || substring(base_hash, 1, 33);
    
    RETURN tron_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the address generation function for TRON
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID)
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
    derivation_path TEXT;
BEGIN
    -- Get next available index
    next_index := get_next_address_index();
    
    -- Generate TRON HD wallet path
    derivation_path := 'm/44''/195''/0''/0/' || next_index::text; -- 195 is TRON's coin type
    
    -- Generate TRON address
    new_address := generate_tron_address(next_index);
    
    -- Insert the new address
    INSERT INTO user_deposit_addresses (
        user_id, 
        deposit_address, 
        derivation_path, 
        address_index, 
        network
    ) VALUES (
        user_uuid, 
        new_address, 
        derivation_path, 
        next_index, 
        'tron'
    );
    
    RETURN QUERY SELECT new_address, derivation_path, next_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing addresses to TRON network (optional - only if you want to migrate existing users)
-- UPDATE user_deposit_addresses SET network = 'tron' WHERE network = 'polygon';
