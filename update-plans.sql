-- Update Investment Plans Script
-- This script will update the existing investment plans with new specifications

-- First, add payout_type column if it doesn't exist
ALTER TABLE investment_plans ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'daily' CHECK (payout_type IN ('daily', 'end'));

-- First, disable all existing plans
UPDATE investment_plans SET is_active = false;

-- Delete existing plans to avoid conflicts
DELETE FROM investment_plans;

-- Insert new investment plans with updated specifications
INSERT INTO investment_plans (name, description, min_amount, max_amount, daily_roi_percentage, duration_days, payout_type, is_active) VALUES
-- 1 day plan - 2% daily
('Daily Plan', 'Quick returns - 1 day investment with 2% daily ROI', 50.00, 100000.00, 2.0, 1, 'daily', true),

-- 3 day plan - 2.3% daily
('3-Day Plan', 'Short term investment - 3 days with 2.3% daily ROI', 100.00, 100000.00, 2.3, 3, 'daily', true),

-- 10 day plan - 2.6% daily
('10-Day Plan', 'Medium term investment - 10 days with 2.6% daily ROI', 200.00, 100000.00, 2.6, 10, 'daily', true),

-- 1 month plan - 120% total return at end
('Monthly Plan', 'Long term investment - 1 month with 120% total return at completion', 100.00, 100000.00, 120.0, 30, 'end', true),

-- 2 month plan - 150% total return at end
('Bi-Monthly Plan', 'Extended investment - 2 months with 150% total return at completion', 100.00, 100000.00, 150.0, 60, 'end', true);

-- Verify the new plans
SELECT * FROM investment_plans WHERE is_active = true ORDER BY duration_days;
