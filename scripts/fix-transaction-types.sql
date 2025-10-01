-- Fix transaction types enum to include 'investment'
-- This script adds the missing 'investment' type to the tx_type enum

-- Add 'investment' to the tx_type enum
ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'investment';

-- Verify the enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.tx_type'::regtype ORDER BY enumsortorder;

-- Note: Run this in Supabase SQL Editor to fix the transaction type issue
-- After running this, plan purchases will work correctly and create investment transactions
