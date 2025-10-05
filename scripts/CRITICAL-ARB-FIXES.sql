-- CRITICAL: Your monitoring system has wrong network detection
-- This will cause ARB deposits to be recorded as 'polygon'

-- Check current deposit monitoring records
SELECT 
    network,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM deposit_monitoring 
GROUP BY network;

-- Check user deposit addresses by network
SELECT 
    network,
    COUNT(*) as address_count
FROM user_deposit_addresses 
GROUP BY network;

-- PROBLEM: Your monitoring code hardcodes network as 'polygon'
-- This means ARB deposits will be recorded wrong!

SELECT 'CRITICAL: Monitoring system needs network detection fix!' as warning;
