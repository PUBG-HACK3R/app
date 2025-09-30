-- Add rejection_reason column to withdrawals table
-- Run this in your Supabase SQL editor

ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
