import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get all user investments
    const { data: allInvestments, error: fetchError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch investments", 
        details: fetchError.message 
      }, { status: 500 });
    }

    // Get transaction logs for this user
    const { data: transactions, error: transactionError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "earning")
      .order("created_at", { ascending: false });

    // Get daily earnings for this user
    const { data: dailyEarnings, error: earningsError } = await admin
      .from("daily_earnings")
      .select("*")
      .eq("user_id", user.id)
      .order("earning_date", { ascending: false });

    const analysis = (allInvestments || []).map(inv => {
      const isEndPayoutPlan = inv.duration_days >= 30;
      const expectedEarnings = isEndPayoutPlan 
        ? (inv.amount_invested * inv.daily_roi_percentage * inv.duration_days) / 100
        : (inv.amount_invested * inv.daily_roi_percentage * inv.duration_days) / 100;

      const relatedTransactions = (transactions || []).filter(t => 
        t.reference_id === inv.id || t.description?.includes(inv.id)
      );

      const relatedEarnings = (dailyEarnings || []).filter(e => 
        e.investment_id === inv.id
      );

      return {
        investment_id: inv.id,
        amount_invested: inv.amount_invested,
        duration_days: inv.duration_days,
        daily_roi_percentage: inv.daily_roi_percentage,
        status: inv.status,
        total_earned: inv.total_earned || 0,
        expected_earnings: Number(expectedEarnings.toFixed(2)),
        earnings_gap: Number((expectedEarnings - (inv.total_earned || 0)).toFixed(2)),
        payout_type: isEndPayoutPlan ? 'end' : 'daily',
        start_date: inv.start_date,
        end_date: inv.end_date,
        created_at: inv.created_at,
        last_earning_date: inv.last_earning_date,
        next_earning_time: inv.next_earning_time,
        has_transactions: relatedTransactions.length > 0,
        transaction_count: relatedTransactions.length,
        has_daily_earnings: relatedEarnings.length > 0,
        daily_earnings_count: relatedEarnings.length,
        issue: inv.status === 'completed' && (inv.total_earned || 0) === 0 ? 'MISSING_EARNINGS' : 
               inv.status === 'completed' && (inv.total_earned || 0) < expectedEarnings ? 'PARTIAL_EARNINGS' : 
               'OK'
      };
    });

    const issues = analysis.filter(a => a.issue !== 'OK');
    const totalMissingEarnings = issues.reduce((sum, issue) => sum + issue.earnings_gap, 0);

    return NextResponse.json({
      success: true,
      analysis: {
        total_investments: analysis.length,
        completed_investments: analysis.filter(a => a.status === 'completed').length,
        active_investments: analysis.filter(a => a.status === 'active').length,
        investments_with_issues: issues.length,
        total_missing_earnings: Number(totalMissingEarnings.toFixed(2)),
        issues_breakdown: {
          missing_earnings: issues.filter(i => i.issue === 'MISSING_EARNINGS').length,
          partial_earnings: issues.filter(i => i.issue === 'PARTIAL_EARNINGS').length
        }
      },
      investments: analysis,
      problematic_investments: issues,
      transaction_summary: {
        total_earning_transactions: (transactions || []).length,
        total_daily_earnings_records: (dailyEarnings || []).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Check completed investments error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
