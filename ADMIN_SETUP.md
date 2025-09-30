# Admin Panel Access Guide

## 🔐 How to Access the Admin Panel

The admin panel is located at: **`http://localhost:3000/admin`**

### Prerequisites:
1. ✅ User account must be registered
2. ✅ User must have `role: "admin"` in their metadata
3. ✅ Must be logged in

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Register a User Account
1. Go to `http://localhost:3000/signup`
2. Create an account with your email
3. Verify your email if required

### Step 2: Make Yourself Admin
Run the admin script with your email:

```bash
# Install dependencies first (if not already done)
npm install @supabase/supabase-js

# Make yourself admin
node make-admin.js your-email@example.com
```

### Step 3: Access Admin Panel
1. Go to `http://localhost:3000/login`
2. Login with your account
3. Visit `http://localhost:3000/admin`

---

## 🛠️ Manual Method (Supabase Dashboard)

If the script doesn't work, you can manually set admin role:

### Option A: Using Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find your user and click on them
5. In **User Metadata**, add:
   ```json
   {
     "role": "admin"
   }
   ```
6. Save changes

### Option B: Using SQL Editor
1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace with your email):
   ```sql
   -- Update user metadata
   UPDATE auth.users 
   SET app_metadata = jsonb_set(
     COALESCE(app_metadata, '{}'), 
     '{role}', 
     '"admin"'
   )
   WHERE email = 'your-email@example.com';

   -- Also update profiles table
   INSERT INTO profiles (user_id, email, role)
   SELECT id, email, 'admin'
   FROM auth.users 
   WHERE email = 'your-email@example.com'
   ON CONFLICT (user_id) 
   DO UPDATE SET role = 'admin';
   ```

---

## 📊 Admin Panel Features

Once you have admin access, you can:

### Dashboard Overview:
- 👥 **Total Users** - Number of registered users
- 💰 **Total Deposits** - All-time deposit amounts
- ⏳ **Pending Withdrawals** - Withdrawals awaiting approval
- 📈 **Total Earnings** - All-time user earnings

### Withdrawal Management:
- ✅ **Approve Withdrawals** - Process user withdrawal requests
- 📋 **View Details** - See withdrawal amounts and addresses
- 🔍 **User Information** - Check user details

---

## 🔧 Troubleshooting

### "Access Denied" or Redirected to Dashboard?
- ✅ Check if you're logged in
- ✅ Verify your user has `role: "admin"` in metadata
- ✅ Try logging out and back in

### Script Errors?
- ✅ Make sure `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Install dependencies: `npm install @supabase/supabase-js`
- ✅ Check your email is correct

### Admin Panel Not Loading?
- ✅ Make sure dev server is running: `npm run dev`
- ✅ Check browser console for errors
- ✅ Verify Supabase connection

---

## 🎯 Quick Test

After setup, test admin access:

1. **Login** with your admin account
2. **Visit** `http://localhost:3000/admin`
3. **Should see** admin dashboard with metrics
4. **Try** approving a test withdrawal (if any exist)

---

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for errors
2. Check server logs for authentication issues
3. Verify your Supabase configuration
4. Make sure your user account is properly created

The admin panel uses **Supabase Auth metadata** to determine admin access, so the role must be set correctly in the user's `app_metadata` or `user_metadata`.
