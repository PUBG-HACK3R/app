-- ===============================================
-- Simple Profile Creation Fix (No Deposit Address)
-- ===============================================
-- This creates a simple profile creation system without deposit address complications

-- Drop all existing problematic triggers
DROP TRIGGER IF EXISTS create_deposit_address_trigger ON profiles;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop problematic functions
DROP FUNCTION IF EXISTS create_deposit_address_for_new_user();
DROP FUNCTION IF EXISTS handle_new_user();

-- Create simple profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, role, created_at)
    VALUES (NEW.id, NEW.email, 'user', NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple trigger for auth user creation
CREATE TRIGGER on_auth_user_created_simple
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

-- Create profiles for existing auth users (safe version)
DO $$
BEGIN
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
    
    RAISE NOTICE 'Profiles created for existing users';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Some profiles could not be created: %', SQLERRM;
END $$;

-- Verify the setup
SELECT 
    'Simple profile creation setup complete!' as status,
    COUNT(*) as total_profiles 
FROM profiles;

-- Show auth users vs profiles
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM profiles) as profiles,
    (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM profiles) as missing_profiles;
