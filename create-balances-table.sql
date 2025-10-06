-- Create the missing balances table
CREATE TABLE IF NOT EXISTS public.balances (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  available_usdt numeric(14,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Create policies for balances table
DROP POLICY IF EXISTS "Balances: owner read" ON public.balances;
CREATE POLICY "Balances: owner read"
  ON public.balances FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admin users full access to all balances
DROP POLICY IF EXISTS "Balances: admin full access" ON public.balances;
CREATE POLICY "Balances: admin full access"
  ON public.balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow users to insert/update their own balance (for upsert operations)
DROP POLICY IF EXISTS "Balances: owner upsert" ON public.balances;
CREATE POLICY "Balances: owner upsert"
  ON public.balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Balances: owner update" ON public.balances;
CREATE POLICY "Balances: owner update"
  ON public.balances FOR UPDATE
  USING (auth.uid() = user_id);

-- Also update transactions table to support new transaction types
DO $$ BEGIN
  ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'investment';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'investment_return';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing columns to transactions table if they don't exist
DO $$ BEGIN
  ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END; $$;

DROP TRIGGER IF EXISTS balances_updated_at ON public.balances;
CREATE TRIGGER balances_updated_at
  BEFORE UPDATE ON public.balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
