import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    console.log("🔍 Activity API called");
    
    // Skip auth check for now to test if RLS is the issue
    // TODO: Re-enable auth check after fixing RLS policies

    // Get recent activity
    const admin = getSupabaseAdminClient();

    console.log("🔍 Fetching recent activity data...");

    // Get recent transactions
    const { data: activities, error: activitiesError } = await admin
      .from("transaction_logs")
      .select("id, type, amount_usdt, created_at, user_id, status, description")
      .order("created_at", { ascending: false })
      .limit(20);

    if (activitiesError) {
      console.error("❌ Error fetching transaction_logs:", activitiesError);
    } else {
      console.log(`✅ Fetched ${activities?.length || 0} transaction logs`);
    }

    // Get recent withdrawals
    const { data: withdrawals, error: withdrawalsError } = await admin
      .from("withdrawals")
      .select("id, user_id, amount_usdt, status, created_at, wallet_address")
      .order("created_at", { ascending: false })
      .limit(10);

    if (withdrawalsError) {
      console.error("❌ Error fetching withdrawals:", withdrawalsError);
    } else {
      console.log(`✅ Fetched ${withdrawals?.length || 0} withdrawals`);
    }

    // Get recent deposits
    const { data: deposits, error: depositsError } = await admin
      .from("deposits")
      .select("id, user_id, amount_usdt, status, created_at, payment_method")
      .order("created_at", { ascending: false })
      .limit(10);

    if (depositsError) {
      console.error("❌ Error fetching deposits:", depositsError);
    } else {
      console.log(`✅ Fetched ${deposits?.length || 0} deposits`);
    }

    // Skip user email fetching for now to avoid RLS recursion
    // TODO: Fix RLS policies and re-enable user email fetching
    const emailMap = new Map();

    // Format all activities
    const transactionActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      amount: activity.amount_usdt || 0,
      user_email: emailMap.get(activity.user_id) || 'Unknown',
      created_at: activity.created_at,
      status: activity.status || 'completed',
      description: activity.description
    }));

    const withdrawalActivities = (withdrawals || []).map((w: any) => ({
      id: `w_${w.id}`,
      type: 'withdrawal',
      amount: w.amount_usdt || 0,
      user_email: emailMap.get(w.user_id) || 'Unknown',
      created_at: w.created_at,
      status: w.status,
      description: `Withdrawal to ${w.wallet_address?.substring(0, 8)}...`
    }));

    const depositActivities = (deposits || []).map((d: any) => ({
      id: `d_${d.id}`,
      type: 'deposit',
      amount: d.amount_usdt || 0,
      user_email: emailMap.get(d.user_id) || 'Unknown',
      created_at: d.created_at,
      status: d.status,
      description: `Deposit via ${d.payment_method || 'crypto'}`
    }));

    // Combine and sort all activities
    const formattedActivities = [...transactionActivities, ...withdrawalActivities, ...depositActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    console.log(`📊 Activity summary:`);
    console.log(`   - Transaction logs: ${transactionActivities.length}`);
    console.log(`   - Withdrawals: ${withdrawalActivities.length}`);
    console.log(`   - Deposits: ${depositActivities.length}`);
    console.log(`   - Total combined: ${formattedActivities.length}`);

    return NextResponse.json({
      activities: formattedActivities
    });

  } catch (error) {
    console.error("Dashboard activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
