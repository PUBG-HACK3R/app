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
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Get all subscriptions (same query as cron job)
    const { data: subs, error: subsErr } = await admin
      .from("subscriptions")
      .select("id,user_id,amount_invested,daily_earning,start_date,end_date,active,total_earned,created_at")
      .eq("active", true);

    if (subsErr) {
      return NextResponse.json({ error: subsErr.message }, { status: 500 });
    }

    // Analyze each subscription with the same logic as cron job
    const analysis = [];
    
    for (const sub of subs || []) {
      const amount = Number(sub.daily_earning || 0);
      const startDate = new Date(sub.start_date);
      const todayDate = new Date(`${today}T00:00:00.000Z`);
      
      let skipReason = null;
      let shouldProcess = true;

      // Check 1: Has daily_earning amount
      if (!amount) {
        skipReason = "No daily_earning amount";
        shouldProcess = false;
      }

      // Check 2: Has subscription started?
      if (shouldProcess && todayDate < startDate) {
        skipReason = "Subscription hasn't started yet";
        shouldProcess = false;
      }

      // Check 3: Has subscription expired?
      if (shouldProcess && sub.end_date) {
        const endDate = new Date(sub.end_date as string);
        if (todayDate > endDate) {
          skipReason = "Subscription expired";
          shouldProcess = false;
        }
      }

      // Check 4: Already credited today?
      let alreadyCredited = false;
      if (shouldProcess) {
        const { data: todayEarning } = await admin
          .from("transactions")
          .select("id,created_at,amount_usdt")
          .eq("user_id", sub.user_id)
          .eq("type", "earning")
          .eq("reference_id", sub.id)
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`)
          .maybeSingle();

        if (todayEarning) {
          skipReason = "Already credited today";
          shouldProcess = false;
          alreadyCredited = true;
        }
      }

      analysis.push({
        subscription_id: sub.id,
        user_id: sub.user_id,
        amount_invested: sub.amount_invested,
        daily_earning: sub.daily_earning,
        total_earned: sub.total_earned,
        start_date: sub.start_date,
        end_date: sub.end_date,
        created_at: sub.created_at,
        active: sub.active,
        
        // Analysis
        today_date: today,
        today_date_obj: todayDate.toISOString(),
        start_date_obj: startDate.toISOString(),
        has_started: todayDate >= startDate,
        days_since_start: Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        
        should_process: shouldProcess,
        skip_reason: skipReason,
        already_credited_today: alreadyCredited
      });
    }

    // Get user's recent earning transactions
    const { data: recentEarnings } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "earning")
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      current_time: nowIso,
      today: today,
      total_subscriptions: subs?.length || 0,
      user_subscriptions: analysis.filter(a => a.user_id === user.id),
      all_subscriptions: analysis,
      recent_earnings: recentEarnings,
      summary: {
        should_process_count: analysis.filter(a => a.should_process).length,
        already_credited_count: analysis.filter(a => a.already_credited_today).length,
        not_started_count: analysis.filter(a => a.skip_reason === "Subscription hasn't started yet").length,
        no_amount_count: analysis.filter(a => a.skip_reason === "No daily_earning amount").length,
        expired_count: analysis.filter(a => a.skip_reason === "Subscription expired").length
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
