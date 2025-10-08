import { NextResponse } from "next/server";
import { db } from "@/lib/database/service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single daily cron job - processes all due earnings and cleanup
export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`🚀 Starting daily processing at ${now.toISOString()}`);

    const supabase = getSupabaseAdminClient();
    let results = {
      earnings_processed: 0,
      investments_completed: 0,
      withdrawals_expired: 0,
      deposits_expired: 0,
      errors: [] as string[]
    };

    // ==================== PROCESS ALL DUE EARNINGS ====================
    
    // Get all active investments that should have earned by now
    const { data: investments, error: investError } = await supabase
      .from('user_investments')
      .select('*')
      .eq('status', 'active')
      .lte('next_earning_time', now.toISOString());

    if (investError) {
      console.error('Error fetching investments:', investError);
      results.errors.push('Failed to fetch investments');
    } else {
      console.log(`📊 Found ${investments?.length || 0} investments due for earnings`);

      // Process each investment
      for (const investment of investments || []) {
        try {
          // Check if already processed today
          const { data: existingEarning } = await supabase
            .from('daily_earnings')
            .select('id')
            .eq('investment_id', investment.id)
            .eq('earning_date', today)
            .single();

          if (existingEarning) {
            // Already processed, just update next earning time
            const nextEarning = new Date(investment.next_earning_time);
            nextEarning.setDate(nextEarning.getDate() + 1);
            
            await supabase
              .from('user_investments')
              .update({ next_earning_time: nextEarning.toISOString() })
              .eq('id', investment.id);
            
            continue;
          }

          // Calculate daily earning
          const dailyEarning = (investment.amount_invested * investment.daily_roi_percentage) / 100;

          // Create earning record
          const { data: earning, error: earningError } = await supabase
            .from('daily_earnings')
            .insert({
              user_id: investment.user_id,
              investment_id: investment.id,
              amount_usdt: dailyEarning,
              earning_date: today
            })
            .select()
            .single();

          if (earningError) {
            console.error(`Error creating earning for investment ${investment.id}:`, earningError);
            results.errors.push(`Failed to create earning for investment ${investment.id}`);
            continue;
          }

          // Add to user's available balance
          const { data: balance } = await supabase
            .from('user_balances')
            .select('available_balance, total_earned')
            .eq('user_id', investment.user_id)
            .single();

          if (balance) {
            await supabase
              .from('user_balances')
              .update({
                available_balance: balance.available_balance + dailyEarning,
                total_earned: balance.total_earned + dailyEarning
              })
              .eq('user_id', investment.user_id);
          }

          // Set next earning time to 24 hours from original time
          const nextEarningTime = new Date(investment.next_earning_time);
          nextEarningTime.setDate(nextEarningTime.getDate() + 1);

          // Update investment
          await supabase
            .from('user_investments')
            .update({
              total_earned: investment.total_earned + dailyEarning,
              last_earning_date: today,
              next_earning_time: nextEarningTime.toISOString()
            })
            .eq('id', investment.id);

          // Log transaction
          await supabase
            .from('transaction_logs')
            .insert({
              user_id: investment.user_id,
              type: 'earning',
              amount_usdt: dailyEarning,
              description: `Daily earning from investment`,
              reference_id: earning.id,
              balance_before: balance?.available_balance || 0,
              balance_after: (balance?.available_balance || 0) + dailyEarning
            });

          // Check if investment is completed
          if (today >= investment.end_date) {
            await supabase
              .from('user_investments')
              .update({ status: 'completed' })
              .eq('id', investment.id);

            // Move locked balance back to available
            const { data: currentBalance } = await supabase
              .from('user_balances')
              .select('available_balance, locked_balance')
              .eq('user_id', investment.user_id)
              .single();

            if (currentBalance) {
              await supabase
                .from('user_balances')
                .update({
                  available_balance: currentBalance.available_balance + investment.amount_invested,
                  locked_balance: currentBalance.locked_balance - investment.amount_invested
                })
                .eq('user_id', investment.user_id);
            }

            results.investments_completed++;
          }

          results.earnings_processed++;
          console.log(`✅ Processed earning: $${dailyEarning} for investment ${investment.id}`);

        } catch (error) {
          console.error(`Error processing investment ${investment.id}:`, error);
          results.errors.push(`Error processing investment ${investment.id}`);
        }
      }
    }

    // ==================== CLEANUP TASKS ====================

    // 1. Mark expired withdrawals
    const { data: expiredWithdrawals } = await supabase
      .from('withdrawals')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())
      .select('id');

    results.withdrawals_expired = expiredWithdrawals?.length || 0;

    // 2. Mark expired deposits (older than 24 hours)
    const expiredTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: expiredDeposits } = await supabase
      .from('deposits')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', expiredTime.toISOString())
      .select('id');

    results.deposits_expired = expiredDeposits?.length || 0;

    console.log('✅ Daily processing completed successfully');
    console.log(`📊 Results: ${results.earnings_processed} earnings, ${results.investments_completed} completed, ${results.withdrawals_expired} expired withdrawals, ${results.deposits_expired} expired deposits`);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily processing completed successfully',
      results,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('❌ Daily processing error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process daily tasks'
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
