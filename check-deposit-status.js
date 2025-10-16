#!/usr/bin/env node

/**
 * Check Deposit Status Script
 * 
 * This script checks the status of deposits and user balances to help diagnose issues.
 * 
 * Usage: node check-deposit-status.js [user_id] [order_id]
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

class DepositChecker {
  async run() {
    const args = process.argv.slice(2);
    const userId = args[0];
    const orderId = args[1];

    console.log('🔍 Checking deposit status...\n');
    
    if (orderId) {
      await this.checkSpecificDeposit(orderId);
    } else if (userId) {
      await this.checkUserDeposits(userId);
    } else {
      await this.checkRecentDeposits();
    }
  }

  async checkSpecificDeposit(orderId) {
    console.log(`🎯 Checking deposit: ${orderId}\n`);

    // Get deposit
    const { data: deposit, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      console.error(`❌ Error fetching deposit:`, error);
      return;
    }

    if (!deposit) {
      console.log(`⚠️ Deposit ${orderId} not found`);
      return;
    }

    await this.displayDepositInfo(deposit);
    await this.checkUserBalance(deposit.user_id);
    await this.checkTransactionLog(deposit);
  }

  async checkUserDeposits(userId) {
    console.log(`👤 Checking deposits for user: ${userId}\n`);

    // Get user balance
    await this.checkUserBalance(userId);

    // Get user deposits
    const { data: deposits, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error(`❌ Error fetching deposits:`, error);
      return;
    }

    if (!deposits || deposits.length === 0) {
      console.log(`⚠️ No deposits found for user ${userId}`);
      return;
    }

    console.log(`\n📋 Recent deposits (${deposits.length}):`);
    for (const deposit of deposits) {
      console.log(`\n${'-'.repeat(50)}`);
      await this.displayDepositInfo(deposit);
      await this.checkTransactionLog(deposit);
    }
  }

  async checkRecentDeposits() {
    console.log('📋 Checking recent deposits...\n');

    const { data: deposits, error } = await supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`❌ Error fetching deposits:`, error);
      return;
    }

    if (!deposits || deposits.length === 0) {
      console.log('⚠️ No deposits found');
      return;
    }

    // Group by status
    const byStatus = deposits.reduce((acc, deposit) => {
      acc[deposit.status] = (acc[deposit.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Deposit Status Summary:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log(`\n📋 Recent deposits (${deposits.length}):`);
    for (const deposit of deposits) {
      console.log(`\n${'-'.repeat(50)}`);
      await this.displayDepositInfo(deposit);
    }
  }

  async displayDepositInfo(deposit) {
    console.log(`🏦 Deposit Information:`);
    console.log(`   Order ID: ${deposit.order_id}`);
    console.log(`   User ID: ${deposit.user_id}`);
    console.log(`   Amount: ${deposit.amount_usdt} USDT`);
    console.log(`   Status: ${deposit.status}`);
    console.log(`   Created: ${deposit.created_at}`);
    console.log(`   Confirmed: ${deposit.confirmed_at || 'Not confirmed'}`);
    console.log(`   Payment ID: ${deposit.payment_id || 'N/A'}`);
    console.log(`   TX Hash: ${deposit.tx_hash || 'N/A'}`);
  }

  async checkUserBalance(userId) {
    const { data: balance, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log(`\n💰 User Balance (${userId}):`);
    if (error) {
      console.log(`   ❌ Error fetching balance: ${error.message}`);
      return;
    }

    if (!balance) {
      console.log(`   ⚠️ No balance record found`);
      return;
    }

    console.log(`   Available: ${balance.available_balance || 0} USDT`);
    console.log(`   Locked: ${balance.locked_balance || 0} USDT`);
    console.log(`   Total Deposited: ${balance.total_deposited || 0} USDT`);
    console.log(`   Total Withdrawn: ${balance.total_withdrawn || 0} USDT`);
    console.log(`   Total Earned: ${balance.total_earned || 0} USDT`);
  }

  async checkTransactionLog(deposit) {
    const { data: transactions, error } = await supabase
      .from('transaction_logs')
      .select('*')
      .eq('reference_id', deposit.id)
      .eq('type', 'deposit');

    console.log(`\n📝 Transaction Log:`);
    if (error) {
      console.log(`   ❌ Error fetching transactions: ${error.message}`);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log(`   ⚠️ No transaction log found for this deposit`);
      return;
    }

    transactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.description}`);
      console.log(`      Amount: ${tx.amount_usdt} USDT`);
      console.log(`      Type: ${tx.type}`);
      console.log(`      Balance: ${tx.balance_before} → ${tx.balance_after} USDT`);
      console.log(`      Created: ${tx.created_at}`);
    });
  }
}

// Run the checker
const checker = new DepositChecker();
checker.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
