// Script to make a user admin
// Run with: node make-admin.js your-email@example.com

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeUserAdmin(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.error('   Usage: node make-admin.js your-email@example.com');
    process.exit(1);
  }

  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Get user by email using admin client
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError.message);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('\n📋 Available users:');
      users.users.forEach(u => {
        console.log(`   - ${u.email} (ID: ${u.id})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Update user metadata to make them admin
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { 
        ...user.app_metadata,
        role: 'admin' 
      }
    });

    if (error) {
      console.error('❌ Error updating user:', error.message);
      process.exit(1);
    }

    console.log('🎉 Successfully made user admin!');
    console.log(`   User: ${email}`);
    console.log(`   Role: admin`);
    console.log(`   Admin panel: http://localhost:3000/admin`);
    
    // Also update the profiles table if it exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: user.id, 
        email: user.email,
        role: 'admin' 
      }, { 
        onConflict: 'user_id' 
      });

    if (profileError) {
      console.log('⚠️  Note: Could not update profiles table:', profileError.message);
    } else {
      console.log('✅ Updated profiles table as well');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];
makeUserAdmin(email);
