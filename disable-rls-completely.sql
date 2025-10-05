-- ===============================================
-- Disable RLS Completely (For Development)
-- ===============================================

-- 1. Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies to prevent any recursion
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- 3. Verify your profile exists and is admin
SELECT 
    'Your Profile Status:' as info,
    user_id,
    email,
    role,
    created_at
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 4. If profile doesn't exist, create it
INSERT INTO profiles (user_id, email, role, created_at) 
VALUES ('8199239d-6d8d-4f30-93fa-61d6019e20d9', 'rtwnoyan@gmail.com', 'admin', NOW()) 
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    email = EXCLUDED.email,
    updated_at = NOW();

-- 5. Final verification
SELECT 
    'Final Status:' as info,
    user_id,
    email,
    role,
    'RLS is now DISABLED' as rls_status
FROM profiles 
WHERE user_id = '8199239d-6d8d-4f30-93fa-61d6019e20d9';

-- 6. Show all profiles
SELECT 
    'All Profiles:' as info,
    user_id,
    email,
    role
FROM profiles 
ORDER BY created_at;
