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

    const now = new Date();
    const nowIso = now.toISOString();

    // Get the $100 subscription that's not earning
    const targetSubId = "9e5a69cb-1155-4f08-b717-ac9cb4d92ea3";
    
    const { data: subscription, error: subError } = await admin
      .from("user_investments")
      .select("*")
      .eq("id", targetSubId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ 
        error: "Subscription not found",
        details: subError 
      }, { status: 404 });
    }

    // Check for last earning transaction for this subscription
    const { data: lastEarning, error: earningError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", subscription.user_id)
      .eq("type", "earning")
      .like("description", `%${subscription.id}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate timing
    const createdAt = new Date(subscription.created_at);
    let nextEarningTime;
    let timingStatus;

    if (!lastEarning) {
      // First earning: 24 hours after subscription creation
      nextEarningTime = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000));
      timingStatus = "first_earning";
    } else {
      // Next earning: 24 hours after last earning
      const lastEarningTime = new Date(lastEarning.created_at);
      nextEarningTime = new Date(lastEarningTime.getTime() + (24 * 60 * 60 * 1000));
      timingStatus = "subsequent_earning";
    }

    const timeUntilNextEarning = nextEarningTime.getTime() - now.getTime();
    const hoursUntilNext = timeUntilNextEarning / (1000 * 60 * 60);
    const isReadyForEarning = now >= nextEarningTime;

    return NextResponse.json({
      subscription,
      last_earning: lastEarning,
      timing_analysis: {
        current_time: nowIso,
        created_at: subscription.created_at,
        next_earning_time: nextEarningTime.toISOString(),
        timing_status: timingStatus,
        time_until_next_earning_ms: timeUntilNextEarning,
        hours_until_next_earning: hoursUntilNext,
        is_ready_for_earning: isReadyForEarning,
        should_earn_now: isReadyForEarning && subscription.active
      },
      debug_info: {
        subscription_age_hours: (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
        has_previous_earnings: !!lastEarning,
        daily_earning_amount: subscription.daily_earning
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Timing check failed",
      message: error.message
    }, { status: 500 });
  }
}
