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

    // Get ALL subscriptions for this user (including inactive)
    const { data: allSubscriptions, error: subError } = await admin
      .from("user_investments")
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
          duration_days,
          daily_roi_percentage
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Get ALL earning transactions for this user
    const { data: allEarnings, error: earningsError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "earning")
      .order("created_at", { ascending: false });

    // Analyze each subscription
    const analysis = (allSubscriptions || []).map(sub => {
      const relatedEarnings = (allEarnings || []).filter(earning => 
        earning.description && earning.description.includes(sub.id)
      );

      return {
        subscription: sub,
        related_earnings: relatedEarnings,
        earnings_count: relatedEarnings.length,
        earnings_total: relatedEarnings.reduce((sum, e) => sum + (Number(e.amount_usdt) || 0), 0)
      };
    });

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      all_subscriptions: analysis,
      all_earnings: allEarnings || [],
      summary: {
        total_subscriptions: allSubscriptions?.length || 0,
        active_subscriptions: allSubscriptions?.filter(s => s.active).length || 0,
        total_earnings_transactions: allEarnings?.length || 0,
        expected_earnings: allSubscriptions?.filter(s => s.active).reduce((sum, s) => sum + (Number(s.daily_earning) || 0), 0) || 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
