-- ===============================================
-- Fix Deposit Address Trigger Error
-- ===============================================
-- This fixes the "record NEW has no field id" error

-- First, let's check what triggers exist and fix them
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    -- List all triggers on profiles table
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'profiles'
    LOOP
        RAISE NOTICE 'Found trigger: % on %', trigger_record.trigger_name, trigger_record.event_manipulation;
    END LOOP;
END $$;

-- Drop problematic triggers if they exist
DROP TRIGGER IF EXISTS create_deposit_address_trigger ON profiles;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Drop the problematic function if it exists
DROP FUNCTION IF EXISTS create_deposit_address_for_new_user();

-- Create a corrected function for deposit address creation
CREATE OR REPLACE FUNCTION public.create_deposit_address_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Use NEW.user_id instead of NEW.id since profiles table uses user_id as primary key
    IF TG_OP = 'INSERT' THEN
        -- Only create deposit address if the function exists
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_user_deposit_address') THEN
            PERFORM generate_user_deposit_address(NEW.user_id);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the corrected trigger
CREATE TRIGGER create_deposit_address_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_deposit_address_for_new_user();

-- Now fix the main profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles table using the auth user's id as user_id
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the auth user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Deposit address trigger fixed successfully!' as status;
