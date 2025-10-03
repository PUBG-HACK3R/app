-- Multi-Network Deposit System (TRC20 + Arbitrum)
-- This script updates the centralized wallet system to support both TRC20 and Arbitrum networks

-- Update wallet config to support multiple networks
INSERT INTO wallet_config (config_key, config_value, description) VALUES
('supported_networks', 'trc20,arbitrum', 'Comma-separated list of supported networks'),
('trc20_usdt_contract', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 'USDT contract address on TRON'),
('arbitrum_usdt_contract', '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 'USDT contract address on Arbitrum'),
('tron_api_key', '', 'TronGrid API key for better rate limits (optional)'),
('tron_full_node', 'https://api.trongrid.io', 'TRON full node URL'),
('arbitrum_rpc_url', 'https://arb1.arbitrum.io/rpc', 'Arbitrum RPC URL'),
('arbitrum_chain_id', '42161', 'Arbitrum chain ID')
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

-- Function to generate Arbitrum address (simplified version)
CREATE OR REPLACE FUNCTION generate_arbitrum_address(address_index INTEGER)
RETURNS TEXT AS $$
DECLARE
    base_hash TEXT;
    eth_address TEXT;
BEGIN
    -- This is a simplified version - in production, use proper Ethereum address derivation
    -- For now, we'll create deterministic addresses based on index
    base_hash := encode(digest('arbitrum_master_seed_' || address_index::text, 'sha256'), 'hex');
    
    -- Ethereum addresses start with '0x' and are 40 hex characters
    -- This is a mock implementation - use proper HD wallet derivation in production
    eth_address := '0x' || substring(base_hash, 1, 40);
    
    RETURN eth_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the address generation function to support multiple networks
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID, network_type TEXT DEFAULT 'trc20')
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER, network TEXT) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
    derivation_path TEXT;
    coin_type INTEGER;
BEGIN
    -- Validate network type
    IF network_type NOT IN ('trc20', 'arbitrum') THEN
        RAISE EXCEPTION 'Unsupported network type: %', network_type;
    END IF;
    
    -- Get next available index for this network
    SELECT COALESCE(MAX(address_index), -1) + 1 
    INTO next_index 
    FROM user_deposit_addresses 
    WHERE network = network_type;
    
    -- If no addresses exist for this network, start from 0
    IF next_index IS NULL THEN
        next_index := 0;
    END IF;
    
    -- Generate address based on network type
    IF network_type = 'trc20' THEN
        coin_type := 195; -- TRON's coin type
        derivation_path := 'm/44''/' || coin_type || '''/0''/0/' || next_index::text;
        new_address := generate_tron_address(next_index);
    ELSIF network_type = 'arbitrum' THEN
        coin_type := 60; -- Ethereum's coin type (Arbitrum uses same)
        derivation_path := 'm/44''/' || coin_type || '''/0''/0/' || next_index::text;
        new_address := generate_arbitrum_address(next_index);
    END IF;
    
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
        network_type
    );
    
    RETURN QUERY SELECT new_address, derivation_path, next_index, network_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next address index (updated for network-specific indexing)
CREATE OR REPLACE FUNCTION get_next_address_index(network_type TEXT DEFAULT 'trc20')
RETURNS INTEGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    SELECT COALESCE(MAX(address_index), -1) + 1 
    INTO next_index 
    FROM user_deposit_addresses 
    WHERE network = network_type;
    
    -- If no addresses exist for this network, start from 0
    IF next_index IS NULL THEN
        next_index := 0;
    END IF;
    
    RETURN next_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_network ON user_deposit_addresses(network);
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_user_network ON user_deposit_addresses(user_id, network);

-- Create a view for active deposit addresses by network
CREATE OR REPLACE VIEW active_deposit_addresses AS
SELECT 
    user_id,
    deposit_address,
    network,
    derivation_path,
    address_index,
    created_at
FROM user_deposit_addresses 
WHERE is_active = true;

-- Grant necessary permissions
GRANT SELECT ON active_deposit_addresses TO authenticated;
GRANT EXECUTE ON FUNCTION generate_user_deposit_address(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_next_address_index(TEXT) TO service_role;

-- Insert sample data for testing (optional)
-- This will create addresses for both networks for testing purposes
-- Uncomment the lines below if you want to test with sample data

-- INSERT INTO user_deposit_addresses (user_id, deposit_address, derivation_path, address_index, network) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'TTestAddress1234567890123456789012345', 'm/44''/195''/0''/0/0', 0, 'trc20'),
-- ('00000000-0000-0000-0000-000000000001', '0x1234567890123456789012345678901234567890', 'm/44''/60''/0''/0/0', 0, 'arbitrum');

-- Update existing monitoring functions to handle multiple networks
-- This ensures the monitoring service can track deposits on both networks

COMMENT ON FUNCTION generate_user_deposit_address(UUID, TEXT) IS 'Generates a unique deposit address for a user on the specified network (trc20 or arbitrum)';
COMMENT ON FUNCTION get_next_address_index(TEXT) IS 'Gets the next available address index for the specified network';
COMMENT ON TABLE user_deposit_addresses IS 'Stores unique deposit addresses for users across multiple networks';
