import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get fresh subscription data directly from database
    const { data: subscriptions, error: subError } = await admin
      .from("subscriptions")
      .select(`
        id,
        plan_id,
        amount_invested,
        daily_earning,
        total_earned,
        start_date,
        end_date,
        active,
        created_at,
        plans!inner (
          name,
          min_amount,
          roi_daily_percent,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Get recent earning transactions for this user
    const { data: earnings, error: earningsError } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "earning")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      subscriptions: subscriptions || [],
      recent_earnings: earnings || [],
      summary: {
        total_subscriptions: subscriptions?.length || 0,
        total_earned_sum: subscriptions?.reduce((sum, sub) => sum + (Number(sub.total_earned) || 0), 0) || 0,
        recent_earnings_count: earnings?.length || 0,
        recent_earnings_sum: earnings?.reduce((sum, tx) => sum + (Number(tx.amount_usdt) || 0), 0) || 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
