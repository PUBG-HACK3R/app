-- Centralized Wallet System
-- Each user gets a unique deposit address, all funds go to main hot wallet

-- User deposit addresses table
CREATE TABLE IF NOT EXISTS user_deposit_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deposit_address TEXT NOT NULL UNIQUE,
    address_index INTEGER NOT NULL,
    network TEXT NOT NULL DEFAULT 'polygon',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Deposit monitoring table - tracks incoming transactions
CREATE TABLE IF NOT EXISTS deposit_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deposit_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    network TEXT NOT NULL DEFAULT 'polygon'
);

-- Centralized withdrawals table (admin controlled)
CREATE TABLE IF NOT EXISTS centralized_withdrawals (
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
    network TEXT NOT NULL DEFAULT 'polygon'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_user_id ON user_deposit_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_address ON user_deposit_addresses(deposit_address);
CREATE INDEX IF NOT EXISTS idx_deposit_monitoring_user_id ON deposit_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_monitoring_address ON deposit_monitoring(deposit_address);
CREATE INDEX IF NOT EXISTS idx_deposit_monitoring_tx_hash ON deposit_monitoring(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposit_monitoring_status ON deposit_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_centralized_withdrawals_user_id ON centralized_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_centralized_withdrawals_status ON centralized_withdrawals(status);

-- Enable Row Level Security
ALTER TABLE user_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE centralized_withdrawals ENABLE ROW LEVEL SECURITY;

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

-- Function to generate deposit address for user
CREATE OR REPLACE FUNCTION generate_user_deposit_address(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_index INTEGER;
    new_address TEXT;
BEGIN
    -- Get the next address index
    SELECT COALESCE(MAX(address_index), 0) + 1 INTO next_index
    FROM user_deposit_addresses;
    
    -- For now, we'll use a deterministic address generation
    -- In production, this should use proper HD wallet derivation
    new_address := '0x' || encode(digest(user_uuid::text || next_index::text, 'sha256'), 'hex');
    new_address := substring(new_address, 1, 42); -- Standard Ethereum address length
    
    -- Insert the new address
    INSERT INTO user_deposit_addresses (user_id, deposit_address, address_index, network)
    VALUES (user_uuid, new_address, next_index, 'polygon');
    
    RETURN new_address;
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
CREATE OR REPLACE TRIGGER trigger_create_deposit_address
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_deposit_address_for_new_user();

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
                'block_number', NEW.block_number,
                'confirmations', NEW.confirmations,
                'network', NEW.network
            )
        );
        
        -- Mark as processed
        NEW.processed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process confirmed deposits
CREATE OR REPLACE TRIGGER trigger_process_confirmed_deposit
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

-- Add updated_at columns if they don't exist
ALTER TABLE user_deposit_addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE deposit_monitoring ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE centralized_withdrawals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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
