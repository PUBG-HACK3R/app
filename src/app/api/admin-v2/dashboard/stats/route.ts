import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
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
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get dashboard stats
    const admin = getSupabaseAdminClient();

    // Get user count
    const { count: totalUsers } = await admin
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    // Get total deposits
    const { data: deposits } = await admin
      .from("transaction_logs")
      .select("amount_usdt")
      .eq("type", "deposit");

    // Get total withdrawals
    const { data: withdrawals } = await admin
      .from("transaction_logs")
      .select("amount_usdt")
      .eq("type", "withdrawal");

    // Get total earnings
    const { data: earnings } = await admin
      .from("transaction_logs")
      .select("amount_usdt")
      .eq("type", "earning");

    // Get pending withdrawals count
    const { count: pendingWithdrawals } = await admin
      .from("withdrawals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get active plans count
    const { count: activePlans } = await admin
      .from("investment_plans")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Get total investments
    const { data: investments } = await admin
      .from("user_investments")
      .select("amount_invested")
      .eq("status", "active");

    // Calculate totals
    const totalDeposits = (deposits || []).reduce((sum: number, d: any) => sum + (d.amount_usdt || 0), 0);
    const totalWithdrawals = (withdrawals || []).reduce((sum: number, w: any) => sum + (w.amount_usdt || 0), 0);
    const totalEarnings = (earnings || []).reduce((sum: number, e: any) => sum + (e.amount_usdt || 0), 0);
    const totalInvestments = (investments || []).reduce((sum: number, i: any) => sum + (i.amount_invested || 0), 0);
    const platformBalance = totalDeposits - totalWithdrawals;

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalDeposits,
      totalWithdrawals,
      totalEarnings,
      pendingWithdrawals: pendingWithdrawals || 0,
      activePlans: activePlans || 0,
      totalInvestments,
      platformBalance
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
