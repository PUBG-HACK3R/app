-- ===============================================
-- Safe Profile Creation Fix (Handles Dependencies)
-- ===============================================
-- This safely removes all dependent triggers and functions

-- First, drop all triggers that might depend on functions
DROP TRIGGER IF EXISTS trigger_create_deposit_address ON profiles;
DROP TRIGGER IF EXISTS create_deposit_address_trigger ON profiles;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;

-- Now safely drop functions with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS create_deposit_address_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_simple() CASCADE;
DROP FUNCTION IF EXISTS generate_user_deposit_address(UUID) CASCADE;

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
DECLARE
    user_record RECORD;
    created_count INTEGER := 0;
BEGIN
    FOR user_record IN 
        SELECT au.id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.user_id
        WHERE p.user_id IS NULL
    LOOP
        BEGIN
            INSERT INTO profiles (user_id, email, role, created_at)
            VALUES (user_record.id, user_record.email, 'user', user_record.created_at);
            created_count := created_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not create profile for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Created % profiles for existing users', created_count;
END $$;

-- Verify the setup
SELECT 
    'Safe profile creation setup complete!' as status,
    COUNT(*) as total_profiles 
FROM profiles;

-- Show final counts
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM profiles) as profiles,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM profiles) 
        THEN 'All users have profiles ✅'
        ELSE 'Some users missing profiles ⚠️'
    END as status;
