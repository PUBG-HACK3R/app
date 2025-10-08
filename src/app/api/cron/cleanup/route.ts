import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Second cron job - handles cleanup tasks
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

    const admin = getSupabaseAdminClient();
    const now = new Date();
    console.log(`🧹 Starting cleanup tasks at ${now.toISOString()}`);
    
    let cleanupResults = {
      expiredWithdrawals: 0,
      expiredDeposits: 0,
      completedInvestments: 0
    };

    // 1. Mark expired withdrawals
    const { data: expiredWithdrawals, error: withdrawalError } = await admin
      .from('withdrawals')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())
      .select('id');

    if (!withdrawalError && expiredWithdrawals) {
      cleanupResults.expiredWithdrawals = expiredWithdrawals.length;
      console.log(`✅ Marked ${expiredWithdrawals.length} withdrawals as expired`);
    }

    // 2. Mark expired deposits (older than 24 hours and still pending)
    const expiredTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: expiredDeposits, error: depositError } = await admin
      .from('deposits')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', expiredTime.toISOString())
      .select('id');

    if (!depositError && expiredDeposits) {
      cleanupResults.expiredDeposits = expiredDeposits.length;
      console.log(`✅ Marked ${expiredDeposits.length} deposits as expired`);
    }

    // 3. Complete investments that have reached end date
    const today = new Date().toISOString().split('T')[0];
    const { data: completedInvestments, error: investmentError } = await admin
      .from('user_investments')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .lt('end_date', today)
      .select('id, user_id, amount_invested');

    if (!investmentError && completedInvestments) {
      cleanupResults.completedInvestments = completedInvestments.length;
      
      // Move locked balance back to available for completed investments
      for (const investment of completedInvestments) {
        const { data: balance } = await admin
          .from('user_balances')
          .select('available_balance, locked_balance')
          .eq('user_id', investment.user_id)
          .single();

        if (balance) {
          await admin
            .from('user_balances')
            .update({
              available_balance: balance.available_balance + investment.amount_invested,
              locked_balance: balance.locked_balance - investment.amount_invested
            })
            .eq('user_id', investment.user_id);
        }
      }
      
      console.log(`✅ Completed ${completedInvestments.length} investments and unlocked balances`);
    }

    console.log('✅ Cleanup tasks completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup tasks completed successfully',
      results: cleanupResults,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('❌ Cleanup cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to run cleanup tasks'
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
