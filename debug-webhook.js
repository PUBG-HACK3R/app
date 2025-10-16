#!/usr/bin/env node

/**
 * Debug Webhook and Deposit Confirmation Issues
 * 
 * This script helps identify why confirmDeposit is failing
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

class WebhookDebugger {
  async debugConfirmDeposit(orderId) {
    console.log(`🔍 Debugging confirmDeposit for order: ${orderId}\n`);

    try {
      // Step 1: Get deposit
      console.log('Step 1: Getting deposit...');
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (depositError) {
        console.error('❌ Error getting deposit:', depositError);
        return;
      }

      if (!deposit) {
        console.error('❌ Deposit not found');
        return;
      }

      console.log('✅ Deposit found:', {
        id: deposit.id,
        user_id: deposit.user_id,
        amount: deposit.amount_usdt,
        status: deposit.status
      });

      if (deposit.status === 'confirmed') {
        console.log('⚠️ Deposit already confirmed, skipping...');
        return;
      }

      // Step 2: Update deposit status
      console.log('\nStep 2: Updating deposit status...');
      const { error: updateError } = await supabase
        .from('deposits')
        .update({
          status: 'confirmed',
          payment_id: 'debug_test',
          confirmed_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (updateError) {
        console.error('❌ Error updating deposit:', updateError);
        return;
      }
      console.log('✅ Deposit status updated');

      // Step 3: Get user balance
      console.log('\nStep 3: Getting user balance...');
      const { data: balance, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', deposit.user_id)
        .single();

      if (balanceError) {
        console.error('❌ Error getting balance:', balanceError);
        return;
      }

      if (!balance) {
        console.error('❌ No balance record found');
        return;
      }

      console.log('✅ Balance found:', {
        available: balance.available_balance,
        total_deposited: balance.total_deposited
      });

      // Step 4: Update balance
      console.log('\nStep 4: Updating balance...');
      const newAvailable = balance.available_balance + deposit.amount_usdt;
      const newTotalDeposited = balance.total_deposited + deposit.amount_usdt;

      const { error: balanceUpdateError } = await supabase
        .from('user_balances')
        .update({
          available_balance: newAvailable,
          total_deposited: newTotalDeposited
        })
        .eq('user_id', deposit.user_id);

      if (balanceUpdateError) {
        console.error('❌ Error updating balance:', balanceUpdateError);
        return;
      }

      console.log('✅ Balance updated:', {
        new_available: newAvailable,
        new_total_deposited: newTotalDeposited
      });

      // Step 5: Create transaction log
      console.log('\nStep 5: Creating transaction log...');
      const { error: logError } = await supabase
        .from('transaction_logs')
        .insert({
          user_id: deposit.user_id,
          type: 'deposit',
          amount_usdt: deposit.amount_usdt,
          description: `Deposit confirmed - Order ${orderId} (Debug test)`,
          reference_id: deposit.id,
          balance_before: balance.available_balance,
          balance_after: newAvailable
        });

      if (logError) {
        console.error('❌ Error creating transaction log:', logError);
        return;
      }

      console.log('✅ Transaction log created');
      console.log('\n🎉 All steps completed successfully!');

    } catch (error) {
      console.error('❌ Unexpected error:', error);
    }
  }

  async testConfirmDepositMethod() {
    console.log('🧪 Testing confirmDeposit method directly...\n');

    // Import the database service
    try {
      const { db } = await import('./src/lib/database/service.js');
      
      // Test with a pending deposit
      const { data: pendingDeposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', 'pending')
        .limit(1)
        .single();

      if (!pendingDeposit) {
        console.log('⚠️ No pending deposits to test with');
        return;
      }

      console.log(`Testing with deposit: ${pendingDeposit.order_id}`);
      
      const result = await db.confirmDeposit(pendingDeposit.order_id, 'test_payment', 'test_hash');
      console.log('Result:', result);

    } catch (error) {
      console.error('❌ Error testing confirmDeposit method:', error);
    }
  }
}

// Run debug
const webhookDebugger = new WebhookDebugger();
const orderId = process.argv[2];

if (orderId) {
  webhookDebugger.debugConfirmDeposit(orderId);
} else {
  console.log('Usage: node debug-webhook.js [order_id]');
  webhookDebugger.testConfirmDepositMethod();
}
