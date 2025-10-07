-- NOWPayments Deposits Table Schema
-- This table stores pending and completed NOWPayments deposits

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS public.deposits CASCADE;

-- Create the deposits table with correct schema for NOWPayments
CREATE TABLE public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL UNIQUE, -- NOWPayments order ID
    amount_usdt DECIMAL(20,8) NOT NULL CHECK (amount_usdt > 0),
    pay_currency TEXT NOT NULL DEFAULT 'usdttrc20', -- Payment currency (usdttrc20, btc, etc.)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'confirming', 'confirmed', 'finished', 'failed', 'refunded', 'expired')),
    tx_hash TEXT, -- Transaction hash when payment is confirmed
    raw JSONB, -- Store full NOWPayments webhook data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX idx_deposits_order_id ON public.deposits(order_id);
CREATE INDEX idx_deposits_status ON public.deposits(status);
CREATE INDEX idx_deposits_created_at ON public.deposits(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own deposits
CREATE POLICY "Users can view own deposits" ON public.deposits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own deposits (for NOWPayments create-invoice)
CREATE POLICY "Users can insert own deposits" ON public.deposits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only service role can update deposits (for NOWPayments webhook)
CREATE POLICY "Service role can update deposits" ON public.deposits
    FOR UPDATE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deposits_updated_at 
    BEFORE UPDATE ON public.deposits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;

-- Insert a comment for documentation
COMMENT ON TABLE public.deposits IS 'Stores NOWPayments deposit transactions with pending/completed status';
COMMENT ON COLUMN public.deposits.order_id IS 'NOWPayments order ID from create-invoice API';
COMMENT ON COLUMN public.deposits.amount_usdt IS 'Deposit amount in USDT';
COMMENT ON COLUMN public.deposits.pay_currency IS 'Payment currency (usdttrc20, btc, eth, etc.)';
COMMENT ON COLUMN public.deposits.status IS 'Payment status from NOWPayments webhook';
COMMENT ON COLUMN public.deposits.tx_hash IS 'Blockchain transaction hash when confirmed';
COMMENT ON COLUMN public.deposits.raw IS 'Full NOWPayments webhook payload for debugging';
