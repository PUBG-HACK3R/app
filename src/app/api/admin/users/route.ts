import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check admin role directly using admin client (same method as admin page)
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: adminCheckError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (adminCheckError || !profile || profile.role !== 'admin') {
      console.log("Users API - Profile error or not admin:", adminCheckError, profile?.role);
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();

    // Get all users from auth
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Get user profiles and transaction summaries
    const userIds = authUsers.users.map(u => u.id);
    
    // Get profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, role, created_at")
      .in("user_id", userIds);

    // Get transaction summaries for each user
    const { data: transactions } = await admin
      .from("transactions")
      .select("user_id, type, amount_usdt")
      .in("user_id", userIds);

    // Get active subscriptions
    const { data: subscriptions } = await admin
      .from("subscriptions")
      .select("user_id, plan_id, status, created_at")
      .in("user_id", userIds)
      .eq("status", "active");

    // Combine data
    const usersWithData = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.user_id === authUser.id);
      const userTransactions = transactions?.filter(t => t.user_id === authUser.id) || [];
      const activeSubscription = subscriptions?.find(s => s.user_id === authUser.id);

      // Calculate balances
      const totalDeposits = userTransactions
        .filter(t => t.type === "deposit")
        .reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
      const totalEarnings = userTransactions
        .filter(t => t.type === "earning")
        .reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
      const totalInvestments = userTransactions
        .filter(t => t.type === "investment")
        .reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
      const totalReturns = userTransactions
        .filter(t => t.type === "investment_return")
        .reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
      const totalWithdrawals = userTransactions
        .filter(t => t.type === "withdrawal")
        .reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
      const balance = totalDeposits + totalEarnings + totalReturns - totalInvestments - totalWithdrawals;

      return {
        id: authUser.id,
        email: authUser.email,
        phone: authUser.phone,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        role: profile?.role || (authUser.app_metadata as any)?.role || (authUser.user_metadata as any)?.role || "user",
        balance: balance,
        total_deposits: totalDeposits,
        total_earnings: totalEarnings,
        total_withdrawals: totalWithdrawals,
        transaction_count: userTransactions.length,
        has_active_subscription: !!activeSubscription,
        subscription_plan: activeSubscription?.plan_id || null,
        profile_created_at: profile?.created_at,
      };
    });

    // Sort by creation date (newest first)
    usersWithData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      users: usersWithData,
      total_count: usersWithData.length,
      admin_count: usersWithData.filter(u => u.role === "admin").length,
      user_count: usersWithData.filter(u => u.role === "user").length,
    });
  } catch (err: any) {
    console.error("Admin users fetch error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
