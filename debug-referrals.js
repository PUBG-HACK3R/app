// Debug script to test referral code functionality
// Run this with: node debug-referrals.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugReferrals() {
  console.log('🔍 Debugging Referral System...\n');

  try {
    // 1. Check if referral codes exist
    console.log('1. Checking existing referral codes...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, referral_code')
      .limit(10);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log(`✅ Found ${profiles.length} profiles`);
    profiles.forEach(profile => {
      console.log(`   - ${profile.email}: ${profile.referral_code || 'NO CODE'}`);
    });

    if (profiles.length === 0) {
      console.log('⚠️  No profiles found. Create a user first.');
      return;
    }

    // 2. Test referral code validation
    const testCode = profiles[0]?.referral_code;
    if (testCode) {
      console.log(`\n2. Testing referral code validation with: ${testCode}`);
      
      const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('user_id, email, referral_code')
        .eq('referral_code', testCode.toUpperCase())
        .single();

      if (referrerError) {
        console.error('❌ Validation failed:', referrerError.message);
      } else {
        console.log('✅ Validation successful:', referrer);
      }
    }

    // 3. Test with a fake code
    console.log('\n3. Testing with invalid code: FAKE123');
    const { data: fakeReferrer, error: fakeError } = await supabase
      .from('profiles')
      .select('user_id, email, referral_code')
      .eq('referral_code', 'FAKE123')
      .single();

    if (fakeError) {
      console.log('✅ Correctly rejected fake code:', fakeError.message);
    } else {
      console.log('❌ Fake code was accepted:', fakeReferrer);
    }

    // 4. Check if referral generation function exists
    console.log('\n4. Testing referral code generation function...');
    const { data: newCode, error: genError } = await supabase
      .rpc('generate_referral_code');

    if (genError) {
      console.error('❌ Code generation failed:', genError.message);
    } else {
      console.log('✅ Generated new code:', newCode);
    }

  } catch (error) {
    console.error('❌ Debug script error:', error.message);
  }
}

debugReferrals();
