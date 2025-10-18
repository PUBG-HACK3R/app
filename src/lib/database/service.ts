/**
 * Clean Database Service Layer
 * Handles all database operations with proper error handling
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { 
  UserProfile, 
  InvestmentPlan, 
  UserBalance, 
  Deposit, 
  UserInvestment, 
  DailyEarning, 
  Withdrawal, 
  ReferralCommission, 
  TransactionLog,
  TABLES 
} from './schema';

export class DatabaseService {
  private admin = getSupabaseAdminClient();

  // ==================== USER PROFILES ====================
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.admin
      .from(TABLES.USER_PROFILES)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  }

  async createUserProfile(userId: string, email: string, referredBy?: string): Promise<UserProfile | null> {
    const referralCode = this.generateReferralCode();
    
    const { data, error } = await this.admin
      .from(TABLES.USER_PROFILES)
      .insert({
        user_id: userId,
        email,
        referral_code: referralCode,
        referred_by: referredBy
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
    
    return data;
  }

  async getUserByReferralCode(referralCode: string): Promise<UserProfile | null> {
    const { data, error } = await this.admin
      .from(TABLES.USER_PROFILES)
      .select('*')
      .eq('referral_code', referralCode)
      .single();
    
    if (error) return null;
    return data;
  }

  // ==================== INVESTMENT PLANS ====================
  
  async getActivePlans(): Promise<InvestmentPlan[]> {
    const { data, error } = await this.admin
      .from(TABLES.INVESTMENT_PLANS)
      .select('*')
      .eq('is_active', true)
      .order('duration_days', { ascending: true });
    
    if (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
    
    return data || [];
  }

  async getPlanById(planId: string): Promise<InvestmentPlan | null> {
    const { data, error } = await this.admin
      .from(TABLES.INVESTMENT_PLANS)
      .select('*')
      .eq('id', planId)
      .single();
    
    if (error) return null;
    return data;
  }

  // ==================== USER BALANCES ====================
  
  async getUserBalance(userId: string): Promise<UserBalance | null> {
    const { data, error } = await this.admin
      .from(TABLES.USER_BALANCES)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user balance:', error);
      return null;
    }
    
    return data;
  }

  async updateUserBalance(userId: string, updates: Partial<UserBalance>): Promise<boolean> {
    const { error } = await this.admin
      .from(TABLES.USER_BALANCES)
      .update(updates)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating user balance:', error);
      return false;
    }
    
    return true;
  }

  async addToBalance(userId: string, amount: number, type: 'available' | 'locked'): Promise<boolean> {
    try {
      console.log(`🔄 Adding ${amount} USDT to ${type} balance for user ${userId}`);
      
      const balance = await this.getUserBalance(userId);
      if (!balance) {
        console.error(`❌ No balance record found for user ${userId}`);
        return false;
      }

      console.log(`📊 Current balance: available=${balance.available_balance}, locked=${balance.locked_balance}`);

      const updates: Partial<UserBalance> = {};
      if (type === 'available') {
        updates.available_balance = balance.available_balance + amount;
      } else {
        updates.locked_balance = balance.locked_balance + amount;
      }

      console.log(`📊 New balance will be: ${JSON.stringify(updates)}`);
      
      const result = await this.updateUserBalance(userId, updates);
      console.log(`✅ Balance update result: ${result}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Exception in addToBalance for user ${userId}:`, error);
      return false;
    }
  }

  // ==================== DEPOSITS ====================
  
  async createDeposit(userId: string, orderId: string, amount: number): Promise<Deposit | null> {
    const { data, error } = await this.admin
      .from(TABLES.DEPOSITS)
      .insert({
        user_id: userId,
        order_id: orderId,
        amount_usdt: amount,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating deposit:', error);
      return null;
    }
    
    return data;
  }

  async updateDeposit(orderId: string, updates: Partial<Deposit>): Promise<boolean> {
    const { error } = await this.admin
      .from(TABLES.DEPOSITS)
      .update(updates)
      .eq('order_id', orderId);
    
    if (error) {
      console.error('Error updating deposit:', error);
      return false;
    }
    
    return true;
  }

  async getDepositByOrderId(orderId: string): Promise<Deposit | null> {
    const { data, error } = await this.admin
      .from(TABLES.DEPOSITS)
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (error) return null;
    return data;
  }

  async confirmDeposit(orderId: string, paymentId?: string, txHash?: string): Promise<boolean> {
    try {
      console.log(`🔄 Starting confirmDeposit for order: ${orderId}`);
      
      const deposit = await this.getDepositByOrderId(orderId);
      if (!deposit) {
        console.error(`❌ Deposit not found for order: ${orderId}`);
        return false;
      }
      
      if (deposit.status === 'confirmed') {
        console.log(`⚠️ Deposit ${orderId} already confirmed, skipping`);
        return false;
      }

      console.log(`📝 Deposit found: ${deposit.id}, User: ${deposit.user_id}, Amount: ${deposit.amount_usdt}`);

      // Update deposit status
      console.log(`🔄 Updating deposit status for ${orderId}...`);
      const depositUpdated = await this.updateDeposit(orderId, {
        status: 'confirmed',
        payment_id: paymentId,
        tx_hash: txHash,
        confirmed_at: new Date().toISOString()
      });

      if (!depositUpdated) {
        console.error(`❌ Failed to update deposit status for ${orderId}`);
        return false;
      }
      console.log(`✅ Deposit status updated for ${orderId}`);

      // Add to user balance
      console.log(`💰 Adding ${deposit.amount_usdt} USDT to user ${deposit.user_id} balance...`);
      const balanceUpdated = await this.addToBalance(deposit.user_id, deposit.amount_usdt, 'available');
      if (!balanceUpdated) {
        console.error(`❌ Failed to update user balance for ${deposit.user_id}`);
        return false;
      }
      console.log(`✅ User balance updated for ${deposit.user_id}`);

      // Update total deposited
      console.log(`📊 Updating total deposited for user ${deposit.user_id}...`);
      const balance = await this.getUserBalance(deposit.user_id);
      if (balance) {
        await this.updateUserBalance(deposit.user_id, {
          total_deposited: balance.total_deposited + deposit.amount_usdt
        });
        console.log(`✅ Total deposited updated: ${balance.total_deposited + deposit.amount_usdt}`);
      } else {
        console.error(`❌ Could not get balance for user ${deposit.user_id}`);
      }

      // Log transaction
      console.log(`📝 Creating transaction log for ${orderId}...`);
      await this.logTransaction(
        deposit.user_id,
        'deposit',
        deposit.amount_usdt,
        `Deposit confirmed - Order ${orderId}`,
        deposit.id
      );
      console.log(`✅ Transaction log created for ${orderId}`);

      // Process referral commission
      console.log(`🎁 Processing referral commission for ${deposit.user_id}...`);
      await this.processReferralCommission(deposit.user_id, deposit.amount_usdt, 'deposit');
      console.log(`✅ Referral commission processed for ${orderId}`);

      console.log(`🎉 Successfully confirmed deposit ${orderId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Exception in confirmDeposit for ${orderId}:`, error);
      return false;
    }
  }

  // ==================== INVESTMENTS ====================
  
  async createInvestment(
    userId: string, 
    planId: string, 
    amount: number
  ): Promise<UserInvestment | null> {
    const plan = await this.getPlanById(planId);
    if (!plan) return null;

    // Check if user has sufficient balance
    const balance = await this.getUserBalance(userId);
    if (!balance || balance.available_balance < amount) return null;

    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    // Set next earning time to 24 hours from investment time
    const nextEarningTime = new Date(now);
    nextEarningTime.setHours(nextEarningTime.getHours() + 24);

    // Create investment
    const { data, error } = await this.admin
      .from(TABLES.USER_INVESTMENTS)
      .insert({
        user_id: userId,
        plan_id: planId,
        amount_invested: amount,
        daily_roi_percentage: plan.daily_roi_percentage,
        duration_days: plan.duration_days,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        next_earning_time: nextEarningTime.toISOString(),
        investment_time: now.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating investment:', error);
      return null;
    }

    // Deduct from available balance and add to locked balance
    await this.updateUserBalance(userId, {
      available_balance: balance.available_balance - amount,
      locked_balance: balance.locked_balance + amount
    });

    // Log transaction
    await this.logTransaction(
      userId,
      'investment',
      -amount,
      `Investment in ${plan.name}`,
      data.id
    );

    // Process referral commission
    await this.processReferralCommission(userId, amount, 'investment');

    return data;
  }

  async getUserInvestments(userId: string): Promise<UserInvestment[]> {
    const { data, error } = await this.admin
      .from(TABLES.USER_INVESTMENTS)
      .select('*, investment_plans(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user investments:', error);
      return [];
    }
    
    return data || [];
  }

  // ==================== DAILY EARNINGS ====================
  
  async processDailyEarnings(): Promise<void> {
    const now = new Date();
    
    // Get investments that are due for earnings (individual timing)
    const { data: investments, error } = await this.admin
      .from(TABLES.USER_INVESTMENTS)
      .select('*')
      .eq('status', 'active')
      .lte('next_earning_time', now.toISOString());

    if (error || !investments) {
      console.error('Error fetching due investments:', error);
      return;
    }

    console.log(`Processing earnings for ${investments.length} investments`);

    for (const investment of investments) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if earnings already processed for today
        const { data: existingEarning } = await this.admin
          .from(TABLES.DAILY_EARNINGS)
          .select('id')
          .eq('investment_id', investment.id)
          .eq('earning_date', today)
          .single();

        if (existingEarning) {
          // Update next earning time to tomorrow at same time
          const nextEarning = new Date(investment.next_earning_time);
          nextEarning.setDate(nextEarning.getDate() + 1);
          
          await this.admin
            .from(TABLES.USER_INVESTMENTS)
            .update({ next_earning_time: nextEarning.toISOString() })
            .eq('id', investment.id);
          
          continue; // Already processed
        }

        // Calculate daily earning
        const dailyEarning = (investment.amount_invested * investment.daily_roi_percentage) / 100;

        // Create earning record
        const { data: earning, error: earningError } = await this.admin
          .from(TABLES.DAILY_EARNINGS)
          .insert({
            user_id: investment.user_id,
            investment_id: investment.id,
            amount_usdt: dailyEarning,
            earning_date: today
          })
          .select()
          .single();

        if (earningError) {
          console.error('Error creating daily earning:', earningError);
          continue;
        }

        // Add to user's available balance
        await this.addToBalance(investment.user_id, dailyEarning, 'available');

        // Set next earning time to 24 hours from now
        const nextEarningTime = new Date(now);
        nextEarningTime.setHours(nextEarningTime.getHours() + 24);

        // Update investment
        await this.admin
          .from(TABLES.USER_INVESTMENTS)
          .update({
            total_earned: investment.total_earned + dailyEarning,
            last_earning_date: today,
            next_earning_time: nextEarningTime.toISOString()
          })
          .eq('id', investment.id);

        // Update user's total earned
        const balance = await this.getUserBalance(investment.user_id);
        if (balance) {
          await this.updateUserBalance(investment.user_id, {
            total_earned: balance.total_earned + dailyEarning
          });
        }

        // Log transaction
        await this.logTransaction(
          investment.user_id,
          'earning',
          dailyEarning,
          `Daily earning from investment`,
          earning.id
        );

        // Check if investment is completed
        if (today >= investment.end_date) {
          await this.admin
            .from(TABLES.USER_INVESTMENTS)
            .update({ status: 'completed' })
            .eq('id', investment.id);

          // Move locked balance back to available
          const currentBalance = await this.getUserBalance(investment.user_id);
          if (currentBalance) {
            await this.updateUserBalance(investment.user_id, {
              available_balance: currentBalance.available_balance + investment.amount_invested,
              locked_balance: currentBalance.locked_balance - investment.amount_invested
            });
          }
        }

        console.log(`✅ Processed earning for investment ${investment.id}: $${dailyEarning}`);

      } catch (error) {
        console.error(`Error processing earning for investment ${investment.id}:`, error);
      }
    }
  }

  // Process earnings for specific time range (for cron optimization)
  async processEarningsInTimeRange(startTime: Date, endTime: Date): Promise<number> {
    const { data: investments, error } = await this.admin
      .from(TABLES.USER_INVESTMENTS)
      .select('*')
      .eq('status', 'active')
      .gte('next_earning_time', startTime.toISOString())
      .lte('next_earning_time', endTime.toISOString());

    if (error || !investments) {
      console.error('Error fetching investments in time range:', error);
      return 0;
    }

    let processedCount = 0;
    for (const investment of investments) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if already processed
        const { data: existingEarning } = await this.admin
          .from(TABLES.DAILY_EARNINGS)
          .select('id')
          .eq('investment_id', investment.id)
          .eq('earning_date', today)
          .single();

        if (existingEarning) continue;

        // Calculate and process earning
        const dailyEarning = (investment.amount_invested * investment.daily_roi_percentage) / 100;

        // Create earning record
        await this.admin
          .from(TABLES.DAILY_EARNINGS)
          .insert({
            user_id: investment.user_id,
            investment_id: investment.id,
            amount_usdt: dailyEarning,
            earning_date: today
          });

        // Update balances and investment
        await this.addToBalance(investment.user_id, dailyEarning, 'available');
        
        const nextEarningTime = new Date(investment.next_earning_time);
        nextEarningTime.setDate(nextEarningTime.getDate() + 1);

        await this.admin
          .from(TABLES.USER_INVESTMENTS)
          .update({
            total_earned: investment.total_earned + dailyEarning,
            last_earning_date: today,
            next_earning_time: nextEarningTime.toISOString()
          })
          .eq('id', investment.id);

        // Update user's total earned
        const balance = await this.getUserBalance(investment.user_id);
        if (balance) {
          await this.updateUserBalance(investment.user_id, {
            total_earned: balance.total_earned + dailyEarning
          });
        }

        // Log transaction
        await this.logTransaction(
          investment.user_id,
          'earning',
          dailyEarning,
          `Daily earning from investment`,
          investment.id
        );

        processedCount++;

      } catch (error) {
        console.error(`Error processing investment ${investment.id}:`, error);
      }
    }

    return processedCount;
  }

  // ==================== WITHDRAWALS ====================
  
  async createWithdrawal(
    userId: string, 
    amount: number, 
    walletAddress: string
  ): Promise<Withdrawal | null> {
    const balance = await this.getUserBalance(userId);
    if (!balance || balance.available_balance < amount) return null;

    const feePercentage = 5; // 5% fee
    const feeAmount = (amount * feePercentage) / 100;
    const netAmount = amount - feeAmount;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    const { data, error } = await this.admin
      .from(TABLES.WITHDRAWALS)
      .insert({
        user_id: userId,
        amount_usdt: amount,
        fee_usdt: feeAmount,
        net_amount_usdt: netAmount,
        wallet_address: walletAddress,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating withdrawal:', error);
      return null;
    }

    return data;
  }

  // ==================== REFERRAL COMMISSIONS ====================
  
  async processReferralCommission(
    userId: string, 
    amount: number, 
    sourceType: 'deposit' | 'investment'
  ): Promise<void> {
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile?.referred_by) return;

    const referrer = await this.getUserByReferralCode(userProfile.referred_by);
    if (!referrer) return;

    const commissionPercentage = 5; // 5% commission
    const commissionAmount = (amount * commissionPercentage) / 100;

    // Create commission record
    const { data, error } = await this.admin
      .from(TABLES.REFERRAL_COMMISSIONS)
      .insert({
        referrer_user_id: referrer.user_id,
        referred_user_id: userId,
        source_type: sourceType,
        source_amount: amount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        status: 'paid' // Auto-pay commissions
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating referral commission:', error);
      return;
    }

    // Add commission to referrer's balance
    await this.addToBalance(referrer.user_id, commissionAmount, 'available');

    // Log transaction for referrer
    await this.logTransaction(
      referrer.user_id,
      'referral_commission',
      commissionAmount,
      `Referral commission from ${sourceType}`,
      data.id
    );
  }

  // ==================== TRANSACTION LOGS ====================
  
  async logTransaction(
    userId: string,
    type: TransactionLog['type'],
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<void> {
    const balance = await this.getUserBalance(userId);
    if (!balance) return;

    const balanceBefore = balance.available_balance;
    const balanceAfter = balanceBefore + amount;

    await this.admin
      .from(TABLES.TRANSACTION_LOGS)
      .insert({
        user_id: userId,
        type,
        amount_usdt: amount,
        description,
        reference_id: referenceId,
        balance_before: balanceBefore,
        balance_after: balanceAfter
      });
  }

  async getUserTransactionLogs(userId: string, limit = 50): Promise<TransactionLog[]> {
    const { data, error } = await this.admin
      .from(TABLES.TRANSACTION_LOGS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transaction logs:', error);
      return [];
    }

    return data || [];
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  private generateReferralCode(): string {
    return 'REF' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
}

// Export singleton instance
export const db = new DatabaseService();
