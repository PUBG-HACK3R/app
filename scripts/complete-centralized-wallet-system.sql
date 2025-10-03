-- Complete Centralized Wallet System
-- Dynamic address generation with HD wallet derivation

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS deposit_monitoring CASCADE;
DROP TABLE IF EXISTS user_deposit_addresses CASCADE;
DROP TABLE IF EXISTS centralized_withdrawals CASCADE;

-- User deposit addresses table with HD wallet support
CREATE TABLE user_deposit_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deposit_address TEXT NOT NULL UNIQUE,
    derivation_path TEXT NOT NULL, -- HD wallet path like m/44'/60'/0'/0/1
    address_index INTEGER NOT NULL UNIQUE, -- Sequential index for HD derivation
    private_key_encrypted TEXT, -- Encrypted private key for this address
    network TEXT NOT NULL DEFAULT 'polygon',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deposit monitoring table - tracks all incoming transactions
CREATE TABLE deposit_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deposit_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    from_address TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    confirmations INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'forwarded', 'failed')),
    forward_tx_hash TEXT, -- Transaction hash when forwarded to main wallet
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    forwarded_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    network TEXT NOT NULL DEFAULT 'polygon',
    gas_used BIGINT,
    gas_price NUMERIC(20, 8),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Centralized withdrawals table (admin controlled)
CREATE TABLE centralized_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_address TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
    fee_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
    net_amount NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed')),
    tx_hash TEXT,
    admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    network TEXT NOT NULL DEFAULT 'polygon',
    gas_used BIGINT,
    gas_price NUMERIC(20, 8),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main wallet configuration table
CREATE TABLE wallet_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert main wallet configuration
INSERT INTO wallet_config (config_key, config_value, description) VALUES
('main_hot_wallet_address', '0x0000000000000000000000000000000000000000', 'Main hot wallet address where all funds are collected'),
('next_address_index', '1', 'Next index for HD wallet derivation'),
('master_public_key', '', 'Master public key for HD wallet derivation'),
('network', 'polygon', 'Default network for operations'),
('min_confirmations', '12', 'Minimum confirmations required for deposits'),
('auto_forward_enabled', 'true', 'Whether to automatically forward deposits to main wallet');

-- Create indexes for performance
CREATE INDEX idx_user_deposit_addresses_user_id ON user_deposit_addresses(user_id);
CREATE INDEX idx_user_deposit_addresses_address ON user_deposit_addresses(deposit_address);
CREATE INDEX idx_user_deposit_addresses_index ON user_deposit_addresses(address_index);
CREATE INDEX idx_deposit_monitoring_user_id ON deposit_monitoring(user_id);
CREATE INDEX idx_deposit_monitoring_address ON deposit_monitoring(deposit_address);
CREATE INDEX idx_deposit_monitoring_tx_hash ON deposit_monitoring(tx_hash);
CREATE INDEX idx_deposit_monitoring_status ON deposit_monitoring(status);
CREATE INDEX idx_deposit_monitoring_block ON deposit_monitoring(block_number);
CREATE INDEX idx_centralized_withdrawals_user_id ON centralized_withdrawals(user_id);
CREATE INDEX idx_centralized_withdrawals_status ON centralized_withdrawals(status);
CREATE INDEX idx_wallet_config_key ON wallet_config(config_key);

-- Enable Row Level Security
ALTER TABLE user_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE centralized_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_deposit_addresses
CREATE POLICY "Users can view their own deposit addresses" ON user_deposit_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all deposit addresses" ON user_deposit_addresses
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for deposit_monitoring
CREATE POLICY "Users can view their own deposits" ON deposit_monitoring
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all deposit monitoring" ON deposit_monitoring
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for centralized_withdrawals
CREATE POLICY "Users can view their own withdrawals" ON centralized_withdrawals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests" ON centralized_withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all withdrawals" ON centralized_withdrawals
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for wallet_config
CREATE POLICY "Service role can manage wallet config" ON wallet_config
    FOR ALL USING (auth.role() = 'service_role');

-- Function to get next address index
CREATE OR REPLACE FUNCTION get_next_address_index()
RETURNS INTEGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    -- Get current next index
    SELECT config_value::INTEGER INTO next_index
    FROM wallet_config
    WHERE config_key = 'next_address_index';
    
    -- Update to next value
    UPDATE wallet_config
    SET config_value = (next_index + 1)::TEXT,
        updated_at = NOW()
    WHERE config_key = 'next_address_index';
    
    RETURN next_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate HD wallet address (simplified version)
CREATE OR REPLACE FUNCTION generate_hd_address(address_index INTEGER)
RETURNS TEXT AS $$
DECLARE
    base_address TEXT;
    derived_address TEXT;
BEGIN
    -- This is a simplified version - in production, use proper HD wallet derivation
    -- For now, we'll create deterministic addresses based on index
    base_address := '0x' || encode(digest('master_seed_' || address_index::text, 'sha256'), 'hex');
    derived_address := substring(base_address, 1, 42);
    
    RETURN derived_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate deposit address for user
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID)
RETURNS TABLE(address TEXT, derivation_path TEXT, address_index INTEGER) AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
    derivation_path TEXT;
BEGIN
    -- Get next available index
    next_index := get_next_address_index();
    
    -- Generate HD wallet path
    derivation_path := 'm/44''/60''/0''/0/' || next_index::text;
    
    -- Generate address using HD derivation (simplified)
    new_address := generate_hd_address(next_index);
    
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
        'polygon'
    );
    
    RETURN QUERY SELECT new_address, derivation_path, next_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process confirmed deposits
CREATE OR REPLACE FUNCTION process_confirmed_deposit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        -- Add to user's balance via transactions table
        INSERT INTO transactions (
            user_id,
            type,
            amount_usdt,
            reference_id,
            meta
        ) VALUES (
            NEW.user_id,
            'deposit',
            NEW.amount,
            NEW.id,
            jsonb_build_object(
                'source', 'centralized_deposit',
                'tx_hash', NEW.tx_hash,
                'deposit_address', NEW.deposit_address,
                'from_address', NEW.from_address,
                'block_number', NEW.block_number,
                'confirmations', NEW.confirmations,
                'network', NEW.network,
                'forwarded', CASE WHEN NEW.forward_tx_hash IS NOT NULL THEN true ELSE false END,
                'forward_tx_hash', NEW.forward_tx_hash
            )
        );
        
        -- Mark as processed
        NEW.processed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create deposit address on user creation
CREATE OR REPLACE FUNCTION create_deposit_address_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate deposit address for new user
    PERFORM generate_user_deposit_address(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create deposit address when user profile is created
DROP TRIGGER IF EXISTS trigger_create_deposit_address ON profiles;
CREATE TRIGGER trigger_create_deposit_address
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_deposit_address_for_new_user();

-- Trigger to process confirmed deposits
DROP TRIGGER IF EXISTS trigger_process_confirmed_deposit ON deposit_monitoring;
CREATE TRIGGER trigger_process_confirmed_deposit
    BEFORE UPDATE ON deposit_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION process_confirmed_deposit();

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update triggers
DROP TRIGGER IF EXISTS update_user_deposit_addresses_updated_at ON user_deposit_addresses;
CREATE TRIGGER update_user_deposit_addresses_updated_at 
    BEFORE UPDATE ON user_deposit_addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deposit_monitoring_updated_at ON deposit_monitoring;
CREATE TRIGGER update_deposit_monitoring_updated_at 
    BEFORE UPDATE ON deposit_monitoring 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_centralized_withdrawals_updated_at ON centralized_withdrawals;
CREATE TRIGGER update_centralized_withdrawals_updated_at 
    BEFORE UPDATE ON centralized_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_config_updated_at ON wallet_config;
CREATE TRIGGER update_wallet_config_updated_at 
    BEFORE UPDATE ON wallet_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
