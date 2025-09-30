-- Update withdrawals table to support new features
-- Run this in your Supabase SQL editor

-- Add new columns for fee tracking and timeout management
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS fee_usdt NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount_usdt NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timeout_reason TEXT;

-- Update existing withdrawals to have fee and net amount calculated
UPDATE public.withdrawals 
SET 
  fee_usdt = ROUND(amount_usdt * 0.05, 2),
  net_amount_usdt = ROUND(amount_usdt * 0.95, 2)
WHERE fee_usdt IS NULL OR net_amount_usdt IS NULL;

-- Check if there are any existing withdrawals with amount < 30
-- We'll only add the constraint for new records, not existing ones
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'withdrawals_minimum_amount' 
    AND table_name = 'withdrawals'
  ) THEN
    -- Check if there are existing records that would violate the constraint
    IF NOT EXISTS (SELECT 1 FROM public.withdrawals WHERE amount_usdt < 30) THEN
      -- Safe to add constraint - no existing violations
      ALTER TABLE public.withdrawals 
      ADD CONSTRAINT withdrawals_minimum_amount 
      CHECK (amount_usdt >= 30);
      
      RAISE NOTICE 'Added minimum amount constraint successfully';
    ELSE
      -- There are existing records that would violate the constraint
      -- We'll skip adding the constraint and handle validation in the application
      RAISE NOTICE 'Skipping minimum amount constraint - existing records with amount < 30 found';
      RAISE NOTICE 'The application will enforce the 30 USD minimum for new withdrawals';
    END IF;
  ELSE
    RAISE NOTICE 'Minimum amount constraint already exists';
  END IF;
END $$;

-- Add index for efficient querying of expiring withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_expires_at 
ON public.withdrawals(expires_at) 
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Add index for processing status
CREATE INDEX IF NOT EXISTS idx_withdrawals_processing 
ON public.withdrawals(processing_started_at, status) 
WHERE status IN ('pending', 'processing');
