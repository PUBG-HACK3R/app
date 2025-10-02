-- Create hot wallet deposit and withdrawal tables
-- These are separate from the existing NOWPayments system

-- Hot wallet deposits table
CREATE TABLE IF NOT EXISTS hotwallet_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
    tx_hash TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hot wallet withdrawals table
CREATE TABLE IF NOT EXISTS hotwallet_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
    to_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hotwallet_deposits_user_id ON hotwallet_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_hotwallet_deposits_status ON hotwallet_deposits(status);
CREATE INDEX IF NOT EXISTS idx_hotwallet_deposits_tx_hash ON hotwallet_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_hotwallet_deposits_created_at ON hotwallet_deposits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hotwallet_withdrawals_user_id ON hotwallet_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_hotwallet_withdrawals_status ON hotwallet_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_hotwallet_withdrawals_created_at ON hotwallet_withdrawals(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE hotwallet_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotwallet_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hotwallet_deposits
CREATE POLICY "Users can view their own hot wallet deposits" ON hotwallet_deposits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hot wallet deposits" ON hotwallet_deposits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for hotwallet_withdrawals
CREATE POLICY "Users can view their own hot wallet withdrawals" ON hotwallet_withdrawals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hot wallet withdrawals" ON hotwallet_withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (service role can access all records)
CREATE POLICY "Service role can manage all hot wallet deposits" ON hotwallet_deposits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all hot wallet withdrawals" ON hotwallet_withdrawals
    FOR ALL USING (auth.role() = 'service_role');

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotwallet_deposits_updated_at 
    BEFORE UPDATE ON hotwallet_deposits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotwallet_withdrawals_updated_at 
    BEFORE UPDATE ON hotwallet_withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
