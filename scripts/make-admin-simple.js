// Simple script to make a user admin
// Run: node scripts/make-admin-simple.js your-email@example.com

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    
    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    
    // Update user metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'admin' }
    });
    
    if (updateError) throw updateError;
    
    // Update or insert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        role: 'admin'
      }, { onConflict: 'user_id' });
    
    if (profileError) throw profileError;
    
    console.log(`🎉 Successfully made ${email} an admin!`);
    console.log('✅ Updated auth metadata');
    console.log('✅ Updated profiles table');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: node scripts/make-admin-simple.js your-email@example.com');
  process.exit(1);
}

makeAdmin(email);
