-- Create proper deposit system tables

-- 1. User deposit addresses table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_deposit_addresses (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_address varchar(255) NOT NULL UNIQUE,
  network varchar(50) NOT NULL DEFAULT 'arbitrum',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Individual deposit transactions table
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_address varchar(255) NOT NULL,
  tx_hash varchar(255) NOT NULL UNIQUE,
  from_address varchar(255),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  network varchar(50) NOT NULL DEFAULT 'arbitrum',
  block_number bigint,
  confirmations integer DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'credited', 'failed', 'forwarded')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  credited_at timestamptz,
  forwarded_at timestamptz,
  forward_tx_hash varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_deposit_addresses
DROP POLICY IF EXISTS "Users can read own deposit addresses" ON public.user_deposit_addresses;
CREATE POLICY "Users can read own deposit addresses"
  ON public.user_deposit_addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access deposit addresses" ON public.user_deposit_addresses;
CREATE POLICY "Admin full access deposit addresses"
  ON public.user_deposit_addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for deposit_transactions
DROP POLICY IF EXISTS "Users can read own deposit transactions" ON public.deposit_transactions;
CREATE POLICY "Users can read own deposit transactions"
  ON public.deposit_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access deposit transactions" ON public.deposit_transactions;
CREATE POLICY "Admin full access deposit transactions"
  ON public.deposit_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_user_id ON public.user_deposit_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_address ON public.user_deposit_addresses(deposit_address);
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_active ON public.user_deposit_addresses(is_active);

CREATE INDEX IF NOT EXISTS idx_deposit_transactions_user_id ON public.deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_status ON public.deposit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_tx_hash ON public.deposit_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_address ON public.deposit_transactions(deposit_address);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS user_deposit_addresses_updated_at ON public.user_deposit_addresses;
CREATE TRIGGER user_deposit_addresses_updated_at
  BEFORE UPDATE ON public.user_deposit_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS deposit_transactions_updated_at ON public.deposit_transactions;
CREATE TRIGGER deposit_transactions_updated_at
  BEFORE UPDATE ON public.deposit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
