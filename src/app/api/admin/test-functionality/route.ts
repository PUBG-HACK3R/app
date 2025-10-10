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
    const results = {};

    // Test 1: Check user profiles count
    try {
      const { count: userCount } = await admin
        .from("user_profiles")
        .select("*", { count: "exact", head: true });
      results.userProfilesCount = userCount || 0;
    } catch (error) {
      results.userProfilesError = error.message;
    }

    // Test 2: Check user balances count
    try {
      const { count: balanceCount } = await admin
        .from("user_balances")
        .select("*", { count: "exact", head: true });
      results.userBalancesCount = balanceCount || 0;
    } catch (error) {
      results.userBalancesError = error.message;
    }

    // Test 3: Check users with balance data
    try {
      const { data: usersWithBalances } = await admin
        .from("user_profiles")
        .select(`
          id,
          email,
          user_balances (
            available_balance,
            locked_balance,
            total_deposited
          )
        `)
        .limit(5);
      
      results.sampleUsersWithBalances = usersWithBalances?.map(u => ({
        email: u.email,
        hasBalance: !!u.user_balances?.[0],
        balance: u.user_balances?.[0] || null
      }));
    } catch (error) {
      results.usersWithBalancesError = error.message;
    }

    // Test 4: Check investment plans
    try {
      const { count: planCount } = await admin
        .from("investment_plans")
        .select("*", { count: "exact", head: true });
      results.investmentPlansCount = planCount || 0;
    } catch (error) {
      results.investmentPlansError = error.message;
    }

    // Test 5: Check user investments
    try {
      const { count: investmentCount } = await admin
        .from("user_investments")
        .select("*", { count: "exact", head: true });
      results.userInvestmentsCount = investmentCount || 0;
    } catch (error) {
      results.userInvestmentsError = error.message;
    }

    // Test 6: Check transaction logs
    try {
      const { count: transactionCount } = await admin
        .from("transaction_logs")
        .select("*", { count: "exact", head: true });
      results.transactionLogsCount = transactionCount || 0;
    } catch (error) {
      results.transactionLogsError = error.message;
    }

    // Test 7: Check withdrawals
    try {
      const { count: withdrawalCount } = await admin
        .from("withdrawals")
        .select("*", { count: "exact", head: true });
      results.withdrawalsCount = withdrawalCount || 0;
    } catch (error) {
      results.withdrawalsError = error.message;
    }

    // Test 8: Database connection test
    try {
      const { data: testQuery } = await admin
        .from("user_profiles")
        .select("id")
        .limit(1);
      results.databaseConnection = "OK";
    } catch (error) {
      results.databaseConnectionError = error.message;
    }

    return NextResponse.json({
      success: true,
      message: "Admin functionality test completed",
      timestamp: new Date().toISOString(),
      adminUser: profile.email,
      results
    });

  } catch (error: any) {
    console.error("Admin test error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
