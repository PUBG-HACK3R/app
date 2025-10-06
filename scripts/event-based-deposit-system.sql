-- Event-Based Deposit System Migration
-- This script creates the new event-based deposit system that replaces sub-wallets with main wallet event tracking

-- 0. Create helper function for updated_at triggers (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- 1. Create deposit intents table (for tracking user deposit requests)
CREATE TABLE IF NOT EXISTS public.deposit_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  network varchar(20) NOT NULL CHECK (network IN ('TRC20', 'BEP20')),
  amount_usdt numeric(12,2) NOT NULL CHECK (amount_usdt > 0),
  reference_code varchar(50) NOT NULL UNIQUE, -- Unique code for user to include in transaction
  main_wallet_address varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'detected', 'confirmed', 'credited', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create event-based deposit transactions table
CREATE TABLE IF NOT EXISTS public.event_deposit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  deposit_intent_id uuid REFERENCES public.deposit_intents(id) ON DELETE SET NULL,
  tx_hash varchar(255) NOT NULL UNIQUE,
  from_address varchar(255) NOT NULL,
  to_address varchar(255) NOT NULL, -- Our main wallet address
  amount_usdt numeric(12,2) NOT NULL CHECK (amount_usdt > 0),
  network varchar(20) NOT NULL CHECK (network IN ('TRC20', 'BEP20')),
  block_number bigint NOT NULL,
  block_hash varchar(255),
  confirmations integer DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'credited', 'failed')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  credited_at timestamptz,
  reference_code varchar(50), -- Extracted from transaction memo/data
  raw_transaction_data jsonb, -- Store full transaction details
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create block tracking table (for recovery after service restarts)
CREATE TABLE IF NOT EXISTS public.block_tracker (
  id SERIAL PRIMARY KEY,
  network varchar(20) NOT NULL UNIQUE CHECK (network IN ('TRC20', 'BEP20')),
  last_processed_block bigint NOT NULL DEFAULT 0,
  contract_address varchar(255) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create main wallet configuration table
CREATE TABLE IF NOT EXISTS public.main_wallets (
  id SERIAL PRIMARY KEY,
  network varchar(20) NOT NULL UNIQUE CHECK (network IN ('TRC20', 'BEP20')),
  address varchar(255) NOT NULL UNIQUE,
  contract_address varchar(255) NOT NULL, -- USDT contract address
  is_active boolean NOT NULL DEFAULT true,
  min_confirmations integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.main_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposit_intents
DROP POLICY IF EXISTS "Users can read own deposit intents" ON public.deposit_intents;
CREATE POLICY "Users can read own deposit intents"
  ON public.deposit_intents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own deposit intents" ON public.deposit_intents;
CREATE POLICY "Users can create own deposit intents"
  ON public.deposit_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access deposit intents" ON public.deposit_intents;
CREATE POLICY "Admin full access deposit intents"
  ON public.deposit_intents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for event_deposit_transactions
DROP POLICY IF EXISTS "Users can read own deposit transactions" ON public.event_deposit_transactions;
CREATE POLICY "Users can read own deposit transactions"
  ON public.event_deposit_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access deposit transactions" ON public.event_deposit_transactions;
CREATE POLICY "Admin full access deposit transactions"
  ON public.event_deposit_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for main_wallets (read-only for users, full access for admin)
DROP POLICY IF EXISTS "Users can read main wallets" ON public.main_wallets;
CREATE POLICY "Users can read main wallets"
  ON public.main_wallets FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin full access main wallets" ON public.main_wallets;
CREATE POLICY "Admin full access main wallets"
  ON public.main_wallets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Block tracker is admin-only
DROP POLICY IF EXISTS "Admin full access block tracker" ON public.block_tracker;
CREATE POLICY "Admin full access block tracker"
  ON public.block_tracker FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deposit_intents_user_id ON public.deposit_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_intents_reference_code ON public.deposit_intents(reference_code);
CREATE INDEX IF NOT EXISTS idx_deposit_intents_status ON public.deposit_intents(status);
CREATE INDEX IF NOT EXISTS idx_deposit_intents_expires_at ON public.deposit_intents(expires_at);

CREATE INDEX IF NOT EXISTS idx_event_deposit_transactions_user_id ON public.event_deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_event_deposit_transactions_tx_hash ON public.event_deposit_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_event_deposit_transactions_status ON public.event_deposit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_event_deposit_transactions_block_number ON public.event_deposit_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_event_deposit_transactions_reference_code ON public.event_deposit_transactions(reference_code);
CREATE INDEX IF NOT EXISTS idx_event_deposit_transactions_network ON public.event_deposit_transactions(network);

CREATE INDEX IF NOT EXISTS idx_block_tracker_network ON public.block_tracker(network);
CREATE INDEX IF NOT EXISTS idx_main_wallets_network ON public.main_wallets(network);
CREATE INDEX IF NOT EXISTS idx_main_wallets_address ON public.main_wallets(address);

-- Create triggers for updated_at
CREATE TRIGGER deposit_intents_updated_at
  BEFORE UPDATE ON public.deposit_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER event_deposit_transactions_updated_at
  BEFORE UPDATE ON public.event_deposit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER block_tracker_updated_at
  BEFORE UPDATE ON public.block_tracker
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER main_wallets_updated_at
  BEFORE UPDATE ON public.main_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert initial main wallet configurations
-- Note: Update these addresses with your actual main wallet addresses
INSERT INTO public.main_wallets (network, address, contract_address, min_confirmations) VALUES
  ('TRC20', 'YOUR_TRON_MAIN_WALLET_ADDRESS', 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj', 12),
  ('BEP20', 'YOUR_BSC_MAIN_WALLET_ADDRESS', '0x55d398326f99059fF775485246999027B3197955', 12)
ON CONFLICT (network) DO UPDATE SET
  address = EXCLUDED.address,
  contract_address = EXCLUDED.contract_address,
  min_confirmations = EXCLUDED.min_confirmations,
  updated_at = now();

-- Initialize block tracker
INSERT INTO public.block_tracker (network, last_processed_block, contract_address) VALUES
  ('TRC20', 0, 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'),
  ('BEP20', 0, '0x55d398326f99059fF775485246999027B3197955')
ON CONFLICT (network) DO NOTHING;

-- Create helper function to generate unique reference codes
CREATE OR REPLACE FUNCTION generate_deposit_reference_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.deposit_intents 
    WHERE reference_code = code;
    
    -- If unique, return the code
    IF exists_check = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired deposit intents
CREATE OR REPLACE FUNCTION cleanup_expired_deposit_intents()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.deposit_intents 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' 
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_deposit_reference_code() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_deposit_intents() TO service_role;

COMMENT ON TABLE public.deposit_intents IS 'Tracks user deposit requests with unique reference codes';
COMMENT ON TABLE public.event_deposit_transactions IS 'Stores detected USDT transfer events to main wallets';
COMMENT ON TABLE public.block_tracker IS 'Tracks last processed block for each network to enable recovery';
COMMENT ON TABLE public.main_wallets IS 'Configuration for main wallet addresses and USDT contracts';
