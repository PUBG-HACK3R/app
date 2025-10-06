-- Fix RLS policies for balances table to allow admin operations

-- Drop existing policies
DROP POLICY IF EXISTS "Balances: owner read" ON public.balances;
DROP POLICY IF EXISTS "Balances: admin full access" ON public.balances;

-- Allow users to read their own balance
CREATE POLICY "Balances: owner read"
  ON public.balances FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admin users full access to all balances
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
CREATE POLICY "Balances: owner upsert"
  ON public.balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Balances: owner update"
  ON public.balances FOR UPDATE
  USING (auth.uid() = user_id);

-- Also update transactions table to allow admin operations
DROP POLICY IF EXISTS "Transactions: admin full access" ON public.transactions;

CREATE POLICY "Transactions: admin full access"
  ON public.transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Update transaction enum to include more types
DO $$ BEGIN
  ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'investment';
  ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'investment_return';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing columns to transactions table if they don't exist
DO $$ BEGIN
  ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
  ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
