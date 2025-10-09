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

    const { data: activities } = await admin
      .from("transaction_logs")
      .select(`
        id,
        type,
        amount_usdt,
        created_at,
        user_id,
        user_profiles!inner (
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    const formattedActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      amount: activity.amount_usdt || 0,
      user_email: activity.user_profiles?.email || 'Unknown',
      created_at: activity.created_at,
      status: 'completed'
    }));

    return NextResponse.json({
      activities: formattedActivities
    });

  } catch (error) {
    console.error("Dashboard activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
