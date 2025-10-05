-- ===============================================
-- Force Admin Access - Comprehensive Fix
-- ===============================================

-- 1. First, run the profile creation fix if not done already
-- Create profiles for any auth users without profiles
INSERT INTO profiles (user_id, email, role, created_at)
SELECT 
    au.id,
    au.email,
    'admin',  -- Make them admin by default
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    email = EXCLUDED.email;

-- 2. Make ALL existing users admin (for testing)
UPDATE profiles SET role = 'admin';

-- 3. Show what we have now
SELECT 
    'After Fix - All Users:' as status,
    email,
    role,
    user_id,
    created_at
FROM profiles 
ORDER BY created_at;

-- 4. Count verification
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
FROM profiles;

-- 5. Show auth users for comparison
SELECT 
    'Auth Users for Reference:' as status,
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at;
