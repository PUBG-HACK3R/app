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

    const admin = getSupabaseAdminClient();

    // Get total users
    const { count: totalUsers } = await admin
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    // Get total balance from user_balances
    const { data: balances } = await admin
      .from("user_balances")
      .select("available_balance, locked_balance");

    const totalBalance = (balances || []).reduce((sum, b) => sum + (b.available_balance || 0) + (b.locked_balance || 0), 0);

    // Get total investments
    const { data: investments } = await admin
      .from("user_investments")
      .select("amount_invested")
      .eq("status", "active");

    const totalInvestments = (investments || []).reduce((sum, inv) => sum + (inv.amount_invested || 0), 0);

    // Get pending withdrawals count
    const { count: pendingWithdrawals } = await admin
      .from("withdrawals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalBalance,
      totalInvestments,
      pendingWithdrawals: pendingWithdrawals || 0
    });

  } catch (error) {
    console.error("System stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
