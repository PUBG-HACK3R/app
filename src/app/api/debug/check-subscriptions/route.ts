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

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Get recent earning transactions
    const { data: earnings, error: earningsError } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "earning")
      .order("created_at", { ascending: false })
      .limit(10);

    if (earningsError) {
      return NextResponse.json({ error: earningsError.message }, { status: 500 });
    }

    // Get user balance
    const { data: balance, error: balanceError } = await admin
      .from("balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Analyze each subscription
    const analysis = subscriptions?.map(sub => {
      const startDate = new Date(sub.start_date);
      const endDate = sub.end_date ? new Date(sub.end_date) : null;
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = endDate ? now > endDate : false;
      
      return {
        id: sub.id,
        active: sub.active,
        amount_invested: sub.amount_invested,
        daily_earning: sub.daily_earning,
        total_earned: sub.total_earned,
        start_date: sub.start_date,
        end_date: sub.end_date,
        created_at: sub.created_at,
        days_since_start: daysSinceStart,
        is_expired: isExpired,
        should_earn_today: sub.active && !isExpired && daysSinceStart >= 0
      };
    }) || [];

    return NextResponse.json({
      user_id: user.id,
      current_time: now.toISOString(),
      today: today,
      subscriptions: analysis,
      recent_earnings: earnings,
      balance: balance,
      summary: {
        total_subscriptions: subscriptions?.length || 0,
        active_subscriptions: subscriptions?.filter(s => s.active).length || 0,
        total_earnings_transactions: earnings?.length || 0,
        expected_daily_earning: subscriptions?.filter(s => s.active).reduce((sum, s) => sum + (Number(s.daily_earning) || 0), 0) || 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
