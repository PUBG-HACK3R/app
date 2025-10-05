-- ===============================================
-- Create Missing Profiles for Existing Auth Users
-- ===============================================
-- This will create profiles for any auth users that don't have them

-- Insert profiles for auth users that don't have profiles yet
INSERT INTO profiles (user_id, email, role, created_at)
SELECT 
    au.id,
    au.email,
    'user',
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Show results
SELECT 
    'Profiles created for existing users' as status,
    COUNT(*) as profiles_created
FROM auth.users au
INNER JOIN profiles p ON au.id = p.user_id;

-- Verify all auth users now have profiles
SELECT 
    COUNT(au.id) as total_auth_users,
    COUNT(p.user_id) as total_profiles,
    COUNT(au.id) - COUNT(p.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id;
