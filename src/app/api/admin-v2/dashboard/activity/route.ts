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

    // Get recent activity
    const admin = getSupabaseAdminClient();

    // Get recent transactions
    const { data: activities } = await admin
      .from("transaction_logs")
      .select("id, type, amount_usdt, created_at, user_id, status, description")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get user emails separately
    const userIds = [...new Set(activities?.map(a => a.user_id) || [])];
    const { data: userProfiles } = await admin
      .from("user_profiles")
      .select("user_id, email")
      .in("user_id", userIds);
    
    const emailMap = new Map(userProfiles?.map(p => [p.user_id, p.email]) || []);

    // Get recent withdrawals
    const { data: withdrawals } = await admin
      .from("withdrawals")
      .select("id, user_id, amount_usdt, status, created_at, wallet_address")
      .order("created_at", { ascending: false })
      .limit(10);

    // Get recent deposits
    const { data: deposits } = await admin
      .from("deposits")
      .select("id, user_id, amount_usdt, status, created_at, payment_method")
      .order("created_at", { ascending: false })
      .limit(10);

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

    return NextResponse.json({
      activities: formattedActivities
    });

  } catch (error) {
    console.error("Dashboard activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
