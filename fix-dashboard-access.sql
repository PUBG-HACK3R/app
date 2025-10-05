-- ===============================================
-- Fix Dashboard Access After Database Reset
-- ===============================================

-- 1. Check if your profile exists
SELECT 
    'Current Profile Status:' as info,
    COUNT(*) as profile_exists
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 2. Check auth users
SELECT 
    'Auth User Status:' as info,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 3. Create profile if missing (safe approach)
INSERT INTO profiles (user_id, email, role, created_at) 
SELECT 
    au.id,
    au.email,
    'admin',
    au.created_at
FROM auth.users au
WHERE au.id = '8199239d-6d8d-4f30-93fa-61d6019e20d9'
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = au.id
);

-- 4. Verify profile was created/exists
SELECT 
    'Final Profile Status:' as info,
    user_id,
    email,
    role,
    created_at
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 5. Show all profiles for debugging
SELECT 
    'All Profiles:' as info,
    user_id,
    email,
    role
FROM profiles 
ORDER BY created_at;
