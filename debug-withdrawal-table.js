const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugWithdrawalTable() {
  console.log('🔍 Debugging withdrawal table structure...\n');

  try {
    // Try to get the latest withdrawal to see the actual column names
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error accessing withdrawals table:', error);
      
      // Try alternative table names
      console.log('\n🔄 Trying alternative table names...');
      
      const alternatives = ['withdrawal', 'user_withdrawals', 'withdrawal_requests'];
      for (const tableName of alternatives) {
        const { data: altData, error: altError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (!altError && altData) {
          console.log(`✅ Found table: ${tableName}`);
          console.log('Columns:', Object.keys(altData[0] || {}));
        }
      }
      
      return;
    }

    if (withdrawals && withdrawals.length > 0) {
      console.log('✅ Withdrawals table found!');
      console.log('📋 Available columns:');
      Object.keys(withdrawals[0]).forEach(column => {
        console.log(`   - ${column}: ${typeof withdrawals[0][column]} (${withdrawals[0][column]})`);
      });
      
      console.log('\n📊 Sample withdrawal data:');
      console.log(JSON.stringify(withdrawals[0], null, 2));
    } else {
      console.log('⚠️ Withdrawals table exists but is empty');
    }

    // Test the specific query that's failing
    console.log('\n🧪 Testing specific query...');
    const testId = '3d862c81-b8b0-4f90-95a8-109360c67597'; // Our test withdrawal
    
    const { data: testWithdrawal, error: testError } = await supabase
      .from('withdrawals')
      .select('id, status, admin_notes')
      .eq('id', testId)
      .single();

    if (testError) {
      console.error('❌ Test query failed:', testError);
    } else {
      console.log('✅ Test query successful:', testWithdrawal);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugWithdrawalTable();
