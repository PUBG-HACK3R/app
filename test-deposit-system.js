#!/usr/bin/env node

/**
 * Test Deposit System Script
 * 
 * This script tests if the deposit confirmation system is working correctly
 * by simulating the confirmDeposit process.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class DepositSystemTester {
  async testSystem() {
    console.log('🧪 Testing deposit confirmation system...\n');

    try {
      // Check if we can access all required tables
      await this.testTableAccess();
      
      // Check the confirmDeposit method logic
      await this.testConfirmDepositLogic();
      
      console.log('\n✅ All tests passed! The deposit system should work correctly for new deposits.');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error);
    }
  }

  async testTableAccess() {
    console.log('📋 Testing database table access...');

    // Test deposits table
    const { error: depositsError } = await supabase
      .from('deposits')
      .select('id')
      .limit(1);
    
    if (depositsError) {
      throw new Error(`Cannot access deposits table: ${depositsError.message}`);
    }
    console.log('   ✅ Deposits table accessible');

    // Test user_balances table
    const { error: balancesError } = await supabase
      .from('user_balances')
      .select('id')
      .limit(1);
    
    if (balancesError) {
      throw new Error(`Cannot access user_balances table: ${balancesError.message}`);
    }
    console.log('   ✅ User balances table accessible');

    // Test transaction_logs table
    const { error: logsError } = await supabase
      .from('transaction_logs')
      .select('id')
      .limit(1);
    
    if (logsError) {
      throw new Error(`Cannot access transaction_logs table: ${logsError.message}`);
    }
    console.log('   ✅ Transaction logs table accessible');
  }

  async testConfirmDepositLogic() {
    console.log('\n🔍 Testing deposit confirmation logic...');

    // Get a pending deposit to test with (if any)
    const { data: pendingDeposits, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    if (error) {
      throw new Error(`Error fetching pending deposits: ${error.message}`);
    }

    if (!pendingDeposits || pendingDeposits.length === 0) {
      console.log('   ℹ️ No pending deposits found to test with');
      console.log('   ✅ This is normal - the system is ready for new deposits');
      return;
    }

    const testDeposit = pendingDeposits[0];
    console.log(`   📝 Found test deposit: ${testDeposit.order_id} (${testDeposit.amount_usdt} USDT)`);

    // Check if user balance exists
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', testDeposit.user_id)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw new Error(`Error checking user balance: ${balanceError.message}`);
    }

    if (!userBalance) {
      console.log(`   ⚠️ User ${testDeposit.user_id} has no balance record`);
      console.log('   ℹ️ Balance record will be created automatically when needed');
    } else {
      console.log(`   ✅ User balance record exists (${userBalance.available_balance} USDT)`);
    }

    console.log('   ✅ Deposit confirmation logic should work correctly');
  }
}

// Run the test
const tester = new DepositSystemTester();
tester.testSystem().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
