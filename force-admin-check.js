// Force check and fix admin role
// Run with: node force-admin-check.js your-email@example.com

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function forceAdminCheck(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.error('   Usage: node force-admin-check.js your-email@example.com');
    process.exit(1);
  }

  try {
    console.log(`🔍 Checking user: ${email}`);
    
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError.message);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('📋 Current user data:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   App Metadata:', JSON.stringify(user.app_metadata, null, 2));
    console.log('   User Metadata:', JSON.stringify(user.user_metadata, null, 2));

    // Check current role
    const currentRole = user.app_metadata?.role || user.user_metadata?.role || 'user';
    console.log(`   Current Role: ${currentRole}`);

    if (currentRole === 'admin') {
      console.log('✅ User already has admin role in metadata');
      
      // Force refresh the user session by updating metadata
      console.log('🔄 Force refreshing user session...');
      
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { 
          ...user.app_metadata,
          role: 'admin',
          updated_at: new Date().toISOString() // Force update
        }
      });

      if (error) {
        console.error('❌ Error updating user:', error.message);
        process.exit(1);
      }

      console.log('✅ Forced session refresh completed');
      
    } else {
      console.log('⚠️  Setting admin role...');
      
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { 
          ...user.app_metadata,
          role: 'admin',
          updated_at: new Date().toISOString()
        }
      });

      if (error) {
        console.error('❌ Error setting admin role:', error.message);
        process.exit(1);
      }

      console.log('✅ Admin role set successfully');
    }

    // Also update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: user.id, 
        email: user.email,
        role: 'admin',
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (profileError) {
      console.log('⚠️  Could not update profiles table:', profileError.message);
    } else {
      console.log('✅ Updated profiles table');
    }

    // Get updated user data
    const { data: updatedUsers } = await supabase.auth.admin.listUsers();
    const updatedUser = updatedUsers.users.find(u => u.email === email);
    
    console.log('\n📋 Updated user data:');
    console.log('   App Metadata:', JSON.stringify(updatedUser.app_metadata, null, 2));
    console.log('   Role:', updatedUser.app_metadata?.role || 'user');

    console.log('\n🎉 Admin setup completed!');
    console.log('📝 Next steps:');
    console.log('   1. Clear your browser cache/cookies');
    console.log('   2. Go to: http://localhost:3000/refresh-session');
    console.log('   3. Click "Force Logout & Re-login"');
    console.log('   4. Login again');
    console.log('   5. Visit: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
forceAdminCheck(email);
