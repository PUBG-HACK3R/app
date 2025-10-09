-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION create_user_profile() RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile with explicit role
    INSERT INTO user_profiles (user_id, email, role, referral_code)
    VALUES (NEW.id, NEW.email, 'user', generate_referral_code());
    
    -- Create user balance record
    INSERT INTO user_balances (user_id, available_balance, locked_balance, total_deposited, total_withdrawn, total_earned)
    VALUES (NEW.id, 0, 0, 0, 0, 0);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile/balance for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;
