#!/usr/bin/env node

/**
 * Fix Deposit Balance Issue Script
 * 
 * This script identifies deposits that are marked as 'confirmed' in the database
 * but haven't been properly credited to user balances, and fixes them.
 * 
 * Usage: node fix-deposit-balance.js [user_id] [order_id]
 * 
 * If no parameters provided, it will scan all confirmed deposits and fix any issues.
 * If user_id provided, it will only check deposits for that user.
 * If order_id provided, it will only check that specific deposit.
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

class DepositFixer {
  constructor() {
    this.fixedCount = 0;
    this.errorCount = 0;
  }

  async run() {
    const args = process.argv.slice(2);
    const userId = args[0];
    const orderId = args[1];

    console.log('🔍 Starting deposit balance fix process...');
    
    if (orderId) {
      console.log(`🎯 Targeting specific order: ${orderId}`);
      await this.fixSpecificDeposit(orderId);
    } else if (userId) {
      console.log(`🎯 Targeting user: ${userId}`);
      await this.fixUserDeposits(userId);
    } else {
      console.log('🔍 Scanning all confirmed deposits...');
      await this.scanAllDeposits();
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Fixed deposits: ${this.fixedCount}`);
    console.log(`❌ Errors: ${this.errorCount}`);
  }

  async fixSpecificDeposit(orderId) {
    try {
      const { data: deposit, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) {
        console.error(`❌ Error fetching deposit ${orderId}:`, error);
        this.errorCount++;
        return;
      }

      if (!deposit) {
        console.log(`⚠️ Deposit ${orderId} not found`);
        return;
      }

      await this.processDeposit(deposit);
    } catch (error) {
      console.error(`❌ Error processing deposit ${orderId}:`, error);
      this.errorCount++;
    }
  }

  async fixUserDeposits(userId) {
    try {
      const { data: deposits, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`❌ Error fetching deposits for user ${userId}:`, error);
        this.errorCount++;
        return;
      }

      if (!deposits || deposits.length === 0) {
        console.log(`⚠️ No confirmed deposits found for user ${userId}`);
        return;
      }

      console.log(`📋 Found ${deposits.length} confirmed deposits for user ${userId}`);

      for (const deposit of deposits) {
        await this.processDeposit(deposit);
      }
    } catch (error) {
      console.error(`❌ Error processing deposits for user ${userId}:`, error);
      this.errorCount++;
    }
  }

  async scanAllDeposits() {
    try {
      const { data: deposits, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(100); // Process in batches

      if (error) {
        console.error('❌ Error fetching confirmed deposits:', error);
        this.errorCount++;
        return;
      }

      if (!deposits || deposits.length === 0) {
        console.log('⚠️ No confirmed deposits found');
        return;
      }

      console.log(`📋 Found ${deposits.length} confirmed deposits to check`);

      for (const deposit of deposits) {
        await this.processDeposit(deposit);
      }
    } catch (error) {
      console.error('❌ Error scanning deposits:', error);
      this.errorCount++;
    }
  }

  async processDeposit(deposit) {
    try {
      console.log(`\n🔍 Checking deposit ${deposit.order_id} (${deposit.amount_usdt} USDT)`);
      console.log(`   User: ${deposit.user_id}`);
      console.log(`   Status: ${deposit.status}`);
      console.log(`   Confirmed at: ${deposit.confirmed_at}`);

      // Check if there's a corresponding transaction log
      const { data: transaction, error: txError } = await supabase
        .from('transaction_logs')
        .select('*')
        .eq('reference_id', deposit.id)
        .eq('type', 'deposit')
        .single();

      if (txError && txError.code !== 'PGRST116') {
        console.error(`   ❌ Error checking transaction:`, txError);
        this.errorCount++;
        return;
      }

      if (transaction) {
        console.log(`   ✅ Transaction already exists (${transaction.id})`);
        return;
      }

      // Get user's current balance
      const { data: balance, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', deposit.user_id)
        .single();

      if (balanceError) {
        console.error(`   ❌ Error fetching user balance:`, balanceError);
        this.errorCount++;
        return;
      }

      if (!balance) {
        console.log(`   ⚠️ No balance record found for user ${deposit.user_id}`);
        // Create balance record
        const { error: createBalanceError } = await supabase
          .from('user_balances')
          .insert({
            user_id: deposit.user_id,
            available_balance: 0,
            locked_balance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            total_earned: 0
          });

        if (createBalanceError) {
          console.error(`   ❌ Error creating balance record:`, createBalanceError);
          this.errorCount++;
          return;
        }

        console.log(`   ✅ Created balance record for user ${deposit.user_id}`);
      }

      // Fix the balance
      await this.creditDepositToBalance(deposit);

    } catch (error) {
      console.error(`❌ Error processing deposit ${deposit.order_id}:`, error);
      this.errorCount++;
    }
  }

  async creditDepositToBalance(deposit) {
    try {
      console.log(`   💰 Crediting ${deposit.amount_usdt} USDT to user ${deposit.user_id}...`);

      // Get current balance
      const { data: currentBalance, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', deposit.user_id)
        .single();

      if (balanceError) {
        console.error(`   ❌ Error fetching current balance:`, balanceError);
        this.errorCount++;
        return;
      }

      // Update balance
      const newAvailableBalance = (currentBalance.available_balance || 0) + deposit.amount_usdt;
      const newTotalDeposited = (currentBalance.total_deposited || 0) + deposit.amount_usdt;

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          available_balance: newAvailableBalance,
          total_deposited: newTotalDeposited
        })
        .eq('user_id', deposit.user_id);

      if (updateError) {
        console.error(`   ❌ Error updating balance:`, updateError);
        this.errorCount++;
        return;
      }

      // Create transaction log
      const { error: logError } = await supabase
        .from('transaction_logs')
        .insert({
          user_id: deposit.user_id,
          type: 'deposit',
          amount_usdt: deposit.amount_usdt,
          description: `Deposit confirmed - Order ${deposit.order_id} (Fixed by script)`,
          reference_id: deposit.id,
          balance_before: currentBalance.available_balance || 0,
          balance_after: newAvailableBalance
        });

      if (logError) {
        console.error(`   ❌ Error creating transaction log:`, logError);
        this.errorCount++;
        return;
      }

      console.log(`   ✅ Successfully credited ${deposit.amount_usdt} USDT`);
      console.log(`   📊 New balance: ${newAvailableBalance} USDT`);
      console.log(`   📈 Total deposited: ${newTotalDeposited} USDT`);
      
      this.fixedCount++;

    } catch (error) {
      console.error(`   ❌ Error crediting deposit:`, error);
      this.errorCount++;
    }
  }
}

// Run the fixer
const fixer = new DepositFixer();
fixer.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
