const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testActivityData() {
  console.log('🔍 Testing activity data sources...\n');

  try {
    // Test transaction_logs
    console.log('1. Testing transaction_logs...');
    const { data: transactions, error: transError } = await supabase
      .from('transaction_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (transError) {
      console.error('❌ Transaction logs error:', transError);
    } else {
      console.log(`✅ Found ${transactions?.length || 0} transaction logs`);
      if (transactions && transactions.length > 0) {
        console.log('   Sample:', transactions[0]);
      }
    }

    // Test deposits
    console.log('\n2. Testing deposits...');
    const { data: deposits, error: depError } = await supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (depError) {
      console.error('❌ Deposits error:', depError);
    } else {
      console.log(`✅ Found ${deposits?.length || 0} deposits`);
      if (deposits && deposits.length > 0) {
        console.log('   Sample:', deposits[0]);
      }
    }

    // Test withdrawals
    console.log('\n3. Testing withdrawals...');
    const { data: withdrawals, error: withError } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (withError) {
      console.error('❌ Withdrawals error:', withError);
    } else {
      console.log(`✅ Found ${withdrawals?.length || 0} withdrawals`);
      if (withdrawals && withdrawals.length > 0) {
        console.log('   Sample:', withdrawals[0]);
      }
    }

    // Test user_profiles
    console.log('\n4. Testing user_profiles...');
    const { data: profiles, error: profError } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .limit(3);

    if (profError) {
      console.error('❌ User profiles error:', profError);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} user profiles`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testActivityData();
