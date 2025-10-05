-- ===============================================
-- Check Admin Access - Debug Script
-- ===============================================

-- 1. Show all users and their roles
SELECT 
    'Current Users and Roles:' as info,
    email,
    role,
    user_id,
    created_at
FROM profiles 
ORDER BY created_at;

-- 2. Make the first user admin (emergency fix)
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
    SELECT user_id 
    FROM profiles 
    ORDER BY created_at 
    LIMIT 1
);

-- 3. Verify admin was set
SELECT 
    'Admin Users After Update:' as info,
    email,
    role,
    user_id
FROM profiles 
WHERE role = 'admin';

-- 4. Show auth users (for reference)
SELECT 
    'Auth Users:' as info,
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at;
