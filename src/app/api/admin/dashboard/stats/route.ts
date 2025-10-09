import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const token = request.headers.get('cookie')?.split('admin_token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: "Admin authentication required" 
      }, { status: 401 });
    }

    const admin = await adminAuth.verifyToken(token);
    if (!admin) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid admin token" 
      }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // Get comprehensive dashboard statistics
    const [
      usersResult,
      balancesResult,
      depositsResult,
      investmentsResult,
      withdrawalsResult,
      earningsResult,
      plansResult
    ] = await Promise.all([
      // Total users
      supabase.from('user_profiles').select('id, created_at, role').order('created_at', { ascending: false }),
      
      // Total balances
      supabase.from('user_balances').select('available_balance, locked_balance, total_deposited, total_withdrawn, total_earned'),
      
      // Deposits stats
      supabase.from('deposits').select('amount_usdt, status, created_at'),
      
      // Investments stats
      supabase.from('user_investments').select('user_id, plan_id, status, amount_invested, total_earned, created_at'),
      
      // Withdrawals stats
      supabase.from('withdrawals').select('amount_usdt, status, created_at'),
      
      // Recent earnings
      supabase.from('daily_earnings').select('amount_usdt, earning_date').order('earning_date', { ascending: false }).limit(30),
      
      // Investment plans
      supabase.from('investment_plans').select('*')
    ]);

    // Calculate statistics
    const users = usersResult.data || [];
    const balances = balancesResult.data || [];
    const deposits = depositsResult.data || [];
    const investments = investmentsResult.data || [];
    const withdrawals = withdrawalsResult.data || [];
    const earnings = earningsResult.data || [];
    const plans = plansResult.data || [];

    // User statistics
    const totalUsers = users.length;
    const newUsersToday = users.filter(u => 
      new Date(u.created_at).toDateString() === new Date().toDateString()
    ).length;

    // Financial statistics
    const totalAvailableBalance = balances.reduce((sum, b) => sum + Number(b.available_balance || 0), 0);
    const totalLockedBalance = balances.reduce((sum, b) => sum + Number(b.locked_balance || 0), 0);
    const totalDeposited = balances.reduce((sum, b) => sum + Number(b.total_deposited || 0), 0);
    const totalWithdrawn = balances.reduce((sum, b) => sum + Number(b.total_withdrawn || 0), 0);
    const totalEarned = balances.reduce((sum, b) => sum + Number(b.total_earned || 0), 0);

    // Deposit statistics
    const confirmedDeposits = deposits.filter(d => d.status === 'confirmed');
    const pendingDeposits = deposits.filter(d => d.status === 'pending');
    const totalDepositAmount = confirmedDeposits.reduce((sum, d) => sum + Number(d.amount_usdt || 0), 0);
    const depositsToday = deposits.filter(d => 
      new Date(d.created_at).toDateString() === new Date().toDateString()
    ).length;

    // Investment statistics
    const activeInvestments = investments.filter(i => i.status === 'active');
    const completedInvestments = investments.filter(i => i.status === 'completed');
    const totalInvested = investments.reduce((sum, i) => sum + Number(i.amount_invested || 0), 0);
    const investmentsToday = investments.filter(i => 
      new Date(i.created_at).toDateString() === new Date().toDateString()
    ).length;

    // Withdrawal statistics
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
    const totalWithdrawalRequests = withdrawals.reduce((sum, w) => sum + Number(w.amount_usdt || 0), 0);

    // Earnings statistics
    const totalEarningsDistributed = earnings.reduce((sum, e) => sum + Number(e.amount_usdt || 0), 0);
    const earningsToday = earnings.filter(e => 
      e.earning_date === new Date().toISOString().split('T')[0]
    ).reduce((sum, e) => sum + Number(e.amount_usdt || 0), 0);

    // Recent activity (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyStats = last7Days.map(date => ({
      date,
      users: users.filter(u => u.created_at.startsWith(date)).length,
      deposits: deposits.filter(d => d.created_at.startsWith(date)).length,
      investments: investments.filter(i => i.created_at.startsWith(date)).length,
      earnings: earnings.filter(e => e.earning_date === date).reduce((sum, e) => sum + Number(e.amount_usdt || 0), 0)
    }));

    return NextResponse.json({
      success: true,
      stats: {
        // User stats
        users: {
          total: totalUsers,
          new_today: newUsersToday,
          active_investors: activeInvestments.length
        },
        
        // Financial overview
        finances: {
          total_available_balance: totalAvailableBalance,
          total_locked_balance: totalLockedBalance,
          total_deposited: totalDeposited,
          total_withdrawn: totalWithdrawn,
          total_earned: totalEarned,
          platform_balance: totalAvailableBalance + totalLockedBalance
        },
        
        // Deposits
        deposits: {
          total_amount: totalDepositAmount,
          confirmed_count: confirmedDeposits.length,
          pending_count: pendingDeposits.length,
          today_count: depositsToday
        },
        
        // Investments
        investments: {
          active_count: activeInvestments.length,
          completed_count: completedInvestments.length,
          locked_balance: totalInvested,
          today_count: investmentsToday
        },
        
        // Withdrawals
        withdrawals: {
          pending_count: pendingWithdrawals.length,
          completed_count: completedWithdrawals.length,
          total_requested: totalWithdrawalRequests
        },
        
        // Earnings
        earnings: {
          total_distributed: totalEarningsDistributed,
          today_amount: earningsToday
        },
        
        // Plans
        plans: {
          total_count: plans.length,
          active_count: plans.filter(p => p.is_active).length
        }
      },
      
      // Charts data
      charts: {
        daily_activity: dailyStats,
        plan_distribution: plans.map(plan => ({
          name: plan.name,
          investments: investments.filter(i => i.plan_id === plan.id).length,
          total_amount: investments
            .filter(i => i.plan_id === plan.id)
            .reduce((sum, i) => sum + Number(i.amount_invested || 0), 0)
        }))
      },
      
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch dashboard statistics" 
    }, { status: 500 });
  }
}
