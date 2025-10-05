-- ===============================================
-- Fix RLS Policy Issue and Set Admin Access
-- ===============================================

-- 1. Temporarily disable RLS on profiles table to fix the recursion
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- 3. Create your profile and set as admin
INSERT INTO profiles (user_id, email, role, created_at) 
VALUES ('8199239d-6d8d-4f30-93fa-61d6019e20d9', 'rtwnoyan@gmail.com', 'admin', NOW()) 
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    email = EXCLUDED.email,
    updated_at = NOW();

-- 4. Verify the profile was created
SELECT 
    'Profile Created/Updated:' as status,
    user_id,
    email,
    role,
    created_at
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 5. Re-enable RLS with simple, non-recursive policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, safe RLS policies
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
        )
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 7. Final verification
SELECT 
    'Final Check - Your Profile:' as status,
    user_id,
    email,
    role
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 8. Show all profiles for verification
SELECT 
    'All Profiles:' as status,
    user_id,
    email,
    role,
    created_at
FROM profiles 
ORDER BY created_at;
