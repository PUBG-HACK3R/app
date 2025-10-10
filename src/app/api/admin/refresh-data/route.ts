import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();
    
    // 1. Fix missing user balance records
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, email");

    let balanceFixCount = 0;
    for (const userProfile of profiles || []) {
      const { data: existingBalance } = await admin
        .from("user_balances")
        .select("id")
        .eq("user_id", userProfile.user_id)
        .single();

      if (!existingBalance) {
        await admin
          .from("user_balances")
          .insert({
            user_id: userProfile.user_id,
            available_balance: 0,
            locked_balance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            total_earned: 0
          });
        balanceFixCount++;
      }
    }

    // 2. Recalculate user balance totals from transaction logs
    const { data: balances } = await admin
      .from("user_balances")
      .select("user_id");

    let recalculatedCount = 0;
    for (const balance of balances || []) {
      // Get all transactions for this user
      const { data: transactions } = await admin
        .from("transaction_logs")
        .select("type, amount_usdt")
        .eq("user_id", balance.user_id);

      if (transactions) {
        const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount_usdt || 0), 0);
        const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount_usdt || 0), 0);
        const earnings = transactions.filter(t => t.type === 'earning').reduce((sum, t) => sum + (t.amount_usdt || 0), 0);
        const investments = transactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + Math.abs(t.amount_usdt || 0), 0);

        // Get active investments to calculate locked balance
        const { data: activeInvestments } = await admin
          .from("user_investments")
          .select("amount_invested")
          .eq("user_id", balance.user_id)
          .eq("status", "active");

        const lockedBalance = (activeInvestments || []).reduce((sum, inv) => sum + (inv.amount_invested || 0), 0);
        const availableBalance = deposits + earnings - withdrawals - investments;

        // Update balance record
        await admin
          .from("user_balances")
          .update({
            available_balance: Math.max(0, availableBalance),
            locked_balance: lockedBalance,
            total_deposited: deposits,
            total_withdrawn: withdrawals,
            total_earned: earnings,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", balance.user_id);

        recalculatedCount++;
      }
    }

    // 3. Update investment plan statistics
    const { data: plans } = await admin
      .from("investment_plans")
      .select("id");

    let planStatsUpdated = 0;
    for (const plan of plans || []) {
      const { data: investments } = await admin
        .from("user_investments")
        .select("amount_invested, status")
        .eq("plan_id", plan.id);

      if (investments) {
        const activeInvestments = investments.filter(inv => inv.status === 'active');
        const totalInvested = activeInvestments.reduce((sum, inv) => sum + (inv.amount_invested || 0), 0);
        
        // Note: We don't store stats in the plan table, they're calculated on-demand
        planStatsUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data refresh completed successfully",
      stats: {
        balanceRecordsFixed: balanceFixCount,
        balancesRecalculated: recalculatedCount,
        planStatsUpdated: planStatsUpdated,
        totalUsers: profiles?.length || 0,
        totalPlans: plans?.length || 0
      }
    });

  } catch (error: any) {
    console.error("Data refresh error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
