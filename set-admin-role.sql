-- Set Admin Role for Current User
-- Run this in Supabase SQL Editor to grant admin access

-- Method 1: If you know your email address
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Method 2: Set the first user as admin (if you're the only user)
-- Uncomment the line below if you want to use this method instead
-- UPDATE profiles SET role = 'admin' WHERE user_id = (SELECT user_id FROM profiles ORDER BY created_at LIMIT 1);

-- Method 3: Set all users as admin (for testing - NOT recommended for production)
-- Uncomment the line below if you want to use this method instead
-- UPDATE profiles SET role = 'admin';

-- Verify the change
SELECT user_id, email, role, created_at 
FROM profiles 
WHERE role = 'admin';

-- If no profiles exist, create one for your user
-- Replace the UUID and email with your actual values
-- INSERT INTO profiles (user_id, email, role) 
-- VALUES ('your-user-uuid-here', 'your-email@example.com', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
