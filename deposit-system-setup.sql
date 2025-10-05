-- ===============================================
-- DEPOSIT SYSTEM WITH UNIQUE ADDRESSES
-- ===============================================
-- Creates unique deposit addresses for each user that forward to main wallet

-- 1. CREATE DEPOSIT ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS deposit_addresses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    network VARCHAR(20) NOT NULL CHECK (network IN ('TRON', 'ARBITRUM')),
    address VARCHAR(100) NOT NULL,
    private_key VARCHAR(100) NOT NULL, -- Encrypted in production
    is_active BOOLEAN DEFAULT true,
    balance_usdt DECIMAL(15,2) DEFAULT 0.00,
    total_received DECIMAL(15,2) DEFAULT 0.00,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, network),
    UNIQUE(address)
);

-- 2. CREATE DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    deposit_address_id INTEGER NOT NULL REFERENCES deposit_addresses(id),
    network VARCHAR(20) NOT NULL,
    from_address VARCHAR(100) NOT NULL,
    to_address VARCHAR(100) NOT NULL,
    amount_usdt DECIMAL(15,2) NOT NULL,
    tx_hash VARCHAR(100) NOT NULL UNIQUE,
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'forwarded', 'failed')),
    forwarded_tx_hash VARCHAR(100),
    forwarded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- 3. CREATE DEPOSIT MONITORING TABLE
CREATE TABLE IF NOT EXISTS deposit_monitoring (
    id SERIAL PRIMARY KEY,
    network VARCHAR(20) NOT NULL,
    last_block_checked BIGINT DEFAULT 0,
    is_monitoring BOOLEAN DEFAULT true,
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(network)
);

-- 4. INSERT INITIAL MONITORING RECORDS
INSERT INTO deposit_monitoring (network, last_block_checked) 
VALUES 
    ('TRON', 0),
    ('ARBITRUM', 0)
ON CONFLICT (network) DO NOTHING;

-- 5. CREATE FUNCTION TO GENERATE DEPOSIT ADDRESS
CREATE OR REPLACE FUNCTION generate_deposit_address(
    p_user_id UUID,
    p_network VARCHAR(20)
) RETURNS TABLE(address VARCHAR(100), private_key VARCHAR(100)) AS $$
DECLARE
    v_address VARCHAR(100);
    v_private_key VARCHAR(100);
    v_seed TEXT;
BEGIN
    -- Generate deterministic seed from user_id and network
    v_seed := p_user_id::text || p_network || extract(epoch from now())::text;
    
    -- For demo purposes, generate pseudo addresses
    -- In production, use proper crypto libraries
    IF p_network = 'TRON' THEN
        v_address := 'T' || upper(substring(md5(v_seed || 'addr'), 1, 33));
        v_private_key := upper(md5(v_seed || 'key'));
    ELSIF p_network = 'ARBITRUM' THEN
        v_address := '0x' || upper(substring(md5(v_seed || 'addr'), 1, 40));
        v_private_key := upper(md5(v_seed || 'key'));
    END IF;
    
    -- Insert or update the address
    INSERT INTO deposit_addresses (user_id, network, address, private_key)
    VALUES (p_user_id, p_network, v_address, v_private_key)
    ON CONFLICT (user_id, network) 
    DO UPDATE SET 
        address = EXCLUDED.address,
        private_key = EXCLUDED.private_key,
        is_active = true;
    
    RETURN QUERY SELECT v_address, v_private_key;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE FUNCTION TO PROCESS DEPOSIT
CREATE OR REPLACE FUNCTION process_deposit(
    p_user_id UUID,
    p_network VARCHAR(20),
    p_from_address VARCHAR(100),
    p_to_address VARCHAR(100),
    p_amount_usdt DECIMAL(15,2),
    p_tx_hash VARCHAR(100),
    p_block_number BIGINT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_deposit_address_id INTEGER;
    v_existing_deposit_id INTEGER;
BEGIN
    -- Check if deposit already exists
    SELECT id INTO v_existing_deposit_id
    FROM deposits
    WHERE tx_hash = p_tx_hash;
    
    IF v_existing_deposit_id IS NOT NULL THEN
        RETURN false; -- Deposit already processed
    END IF;
    
    -- Get deposit address ID
    SELECT id INTO v_deposit_address_id
    FROM deposit_addresses
    WHERE user_id = p_user_id AND network = p_network AND address = p_to_address;
    
    IF v_deposit_address_id IS NULL THEN
        RETURN false; -- Invalid deposit address
    END IF;
    
    -- Insert deposit record
    INSERT INTO deposits (
        user_id,
        deposit_address_id,
        network,
        from_address,
        to_address,
        amount_usdt,
        tx_hash,
        block_number,
        status
    ) VALUES (
        p_user_id,
        v_deposit_address_id,
        p_network,
        p_from_address,
        p_to_address,
        p_amount_usdt,
        p_tx_hash,
        p_block_number,
        'confirmed'
    );
    
    -- Update user balance
    UPDATE profiles
    SET balance_usdt = balance_usdt + p_amount_usdt
    WHERE user_id = p_user_id;
    
    -- Update deposit address stats
    UPDATE deposit_addresses
    SET 
        balance_usdt = balance_usdt + p_amount_usdt,
        total_received = total_received + p_amount_usdt,
        last_checked = CURRENT_TIMESTAMP
    WHERE id = v_deposit_address_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        type,
        amount_usdt,
        status,
        description,
        reference_id
    ) VALUES (
        p_user_id,
        'deposit',
        p_amount_usdt,
        'completed',
        'USDT deposit via ' || p_network,
        p_tx_hash
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_user_network ON deposit_addresses(user_id, network);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_address ON deposit_addresses(address);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_network ON deposits(network);

-- 8. GRANT PERMISSIONS
GRANT ALL ON deposit_addresses TO postgres, service_role;
GRANT ALL ON deposits TO postgres, service_role;
GRANT ALL ON deposit_monitoring TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON deposit_addresses TO authenticated;
GRANT SELECT, INSERT ON deposits TO authenticated;
GRANT SELECT ON deposit_monitoring TO authenticated;

-- 9. ENABLE RLS
ALTER TABLE deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_monitoring ENABLE ROW LEVEL SECURITY;

-- 10. CREATE RLS POLICIES (DROP IF EXISTS FIRST)
DROP POLICY IF EXISTS "deposit_addresses_own" ON deposit_addresses;
CREATE POLICY "deposit_addresses_own" ON deposit_addresses
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "deposits_own" ON deposits;
CREATE POLICY "deposits_own" ON deposits
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "deposit_monitoring_read" ON deposit_monitoring;
CREATE POLICY "deposit_monitoring_read" ON deposit_monitoring
    FOR SELECT USING (true);

-- ===============================================
-- USAGE INSTRUCTIONS:
-- ===============================================
-- 1. Run this script to create the deposit system
-- 2. Use generate_deposit_address() to create unique addresses
-- 3. Monitor blockchain for incoming transactions
-- 4. Use process_deposit() to credit user accounts
-- 
-- EXAMPLE USAGE:
-- SELECT * FROM generate_deposit_address('user-uuid-here', 'TRON');
-- SELECT process_deposit('user-uuid', 'TRON', 'from_addr', 'to_addr', 100.00, 'tx_hash');
-- ===============================================
