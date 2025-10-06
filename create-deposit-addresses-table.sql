-- Create deposit_addresses table
CREATE TABLE IF NOT EXISTS public.deposit_addresses (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network varchar(20) NOT NULL,
  address varchar(255) NOT NULL UNIQUE,
  private_key text, -- In production, this should be encrypted
  is_active boolean NOT NULL DEFAULT true,
  balance_usdt numeric(12,2) DEFAULT 0,
  total_received numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own deposit addresses" ON public.deposit_addresses;
CREATE POLICY "Users can read own deposit addresses"
  ON public.deposit_addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access deposit addresses" ON public.deposit_addresses;
CREATE POLICY "Admin full access deposit addresses"
  ON public.deposit_addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_user_id ON public.deposit_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_network ON public.deposit_addresses(network);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_address ON public.deposit_addresses(address);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_active ON public.deposit_addresses(is_active);
