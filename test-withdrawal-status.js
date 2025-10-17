#!/usr/bin/env node

/**
 * Test Withdrawal Status Check Functionality
 * 
 * This script helps test the withdrawal status checking feature
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

class WithdrawalStatusTester {
  async testWithdrawalStatus(userId) {
    console.log(`🧪 Testing withdrawal status for user: ${userId}\n`);

    try {
      // Get user's withdrawals
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching withdrawals:', error);
        return;
      }

      if (!withdrawals || withdrawals.length === 0) {
        console.log('⚠️ No withdrawals found for this user');
        return;
      }

      console.log(`📋 Found ${withdrawals.length} withdrawals:\n`);

      withdrawals.forEach((withdrawal, index) => {
        console.log(`${index + 1}. Withdrawal ID: ${withdrawal.id}`);
        console.log(`   Amount: $${withdrawal.amount_usdt} USDT`);
        console.log(`   Status: ${withdrawal.status}`);
        console.log(`   Address: ${withdrawal.wallet_address}`);
        console.log(`   Created: ${withdrawal.created_at}`);
        console.log(`   Admin Notes: ${withdrawal.admin_notes || 'None'}`);
        console.log(`   Expires: ${withdrawal.expires_at}`);
        console.log('');
      });

      // Test status update
      const pendingWithdrawal = withdrawals.find(w => w.status === 'pending');
      if (pendingWithdrawal) {
        console.log(`🔧 Testing status update for withdrawal: ${pendingWithdrawal.id}`);
        await this.simulateStatusUpdate(pendingWithdrawal.id);
      } else {
        console.log('ℹ️ No pending withdrawals to test status update');
      }

    } catch (error) {
      console.error('❌ Error in test:', error);
    }
  }

  async simulateStatusUpdate(withdrawalId) {
    console.log('\n🎭 Simulating admin actions...\n');

    // Simulate approval
    console.log('1. Testing approval...');
    const { error: approveError } = await supabase
      .from('withdrawals')
      .update({
        status: 'approved',
        admin_notes: 'Approved by admin for testing',
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (approveError) {
      console.error('❌ Error simulating approval:', approveError);
    } else {
      console.log('✅ Simulated approval successfully');
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate rejection
    console.log('\n2. Testing rejection...');
    const { error: rejectError } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        admin_notes: 'Rejected for testing - insufficient verification documents',
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (rejectError) {
      console.error('❌ Error simulating rejection:', rejectError);
    } else {
      console.log('✅ Simulated rejection successfully');
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Reset to pending
    console.log('\n3. Resetting to pending...');
    const { error: resetError } = await supabase
      .from('withdrawals')
      .update({
        status: 'pending',
        admin_notes: null,
        processed_at: null
      })
      .eq('id', withdrawalId);

    if (resetError) {
      console.error('❌ Error resetting status:', resetError);
    } else {
      console.log('✅ Reset to pending successfully');
    }

    console.log('\n🎉 Status update simulation complete!');
  }

  async createTestWithdrawal(userId) {
    console.log(`🔧 Creating test withdrawal for user: ${userId}`);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours from now

    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount_usdt: 50,
        fee_usdt: 2.5,
        net_amount_usdt: 47.5,
        wallet_address: '0x742d35Cc6634C0532925a3b8D4f25177CF1aF4b5',
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating test withdrawal:', error);
      return null;
    }

    console.log('✅ Test withdrawal created:', withdrawal.id);
    return withdrawal;
  }
}

// Run the test
const tester = new WithdrawalStatusTester();
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node test-withdrawal-status.js [user_id]');
  console.log('Example: node test-withdrawal-status.js 89bd2b50-da52-4ccd-bc5a-ecbabd663838');
  process.exit(1);
}

tester.testWithdrawalStatus(userId).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
