-- Create a function to force update admin role
CREATE OR REPLACE FUNCTION force_admin_role(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the profile role to admin
    UPDATE profiles 
    SET role = 'admin', updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        SELECT json_build_object(
            'success', true,
            'message', 'Role updated to admin',
            'user_id', target_user_id,
            'updated_at', NOW()
        ) INTO result;
    ELSE
        -- If no row was found, try to insert a new profile
        INSERT INTO profiles (user_id, role, created_at, updated_at)
        VALUES (target_user_id, 'admin', NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'admin', updated_at = NOW();
        
        SELECT json_build_object(
            'success', true,
            'message', 'Profile created/updated with admin role',
            'user_id', target_user_id,
            'updated_at', NOW()
        ) INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
