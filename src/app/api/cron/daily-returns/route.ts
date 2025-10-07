import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "REVALIDATE_SECRET not set" }, { status: 500 });
  const token = url.searchParams.get("token");
  const headerOk = !!auth && auth === `Bearer ${secret}`;
  const tokenOk = !!token && token === secret;
  if (!headerOk && !tokenOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    
    console.log("Cron job starting:", { now: nowIso, today });

    // Find subscriptions that are active and due for earning credit
    // Conditions:
    // - active = true
    // - (next_earning_at is null OR next_earning_at <= now)
    let query = admin
      .from("subscriptions")
      .select(
        "id,user_id,amount_invested,daily_earning,start_date,end_date,active"
      )
      .eq("active", true);

    const { data: subs, error: subsErr } = await query;
    if (subsErr) {
      return NextResponse.json({ error: subsErr.message }, { status: 500 });
    }

    let credited = 0;

    for (const sub of subs || []) {
      console.log(`Processing subscription ${sub.id} for user ${sub.user_id}`);
      
      // Use the daily_earning directly from the subscription
      const amount = Number(sub.daily_earning || 0);
      if (!amount) {
        console.log(`Subscription ${sub.id} has no daily_earning amount - skipping`);
        continue;
      }
      
      console.log(`Subscription ${sub.id} daily_earning: $${amount}`);

      // Check if subscription has started (should be earning)
      // Parse start_date as UTC to avoid timezone issues
      const startDateStr = sub.start_date.includes('T') ? sub.start_date : `${sub.start_date}T00:00:00.000Z`;
      const startDate = new Date(startDateStr);
      const todayDate = new Date(`${today}T00:00:00.000Z`);
      
      console.log(`Subscription ${sub.id} date check:`, {
        start_date: sub.start_date,
        start_date_parsed: startDate.toISOString(),
        today_date: todayDate.toISOString(),
        has_started: todayDate >= startDate
      });
      
      // Skip if subscription hasn't started yet
      if (todayDate < startDate) {
        console.log(`Subscription ${sub.id} hasn't started yet - skipping`);
        continue;
      }

      // If subscription has ended, deactivate and skip credit
      if (sub.end_date) {
        const endDate = new Date(sub.end_date as string);
        if (todayDate > endDate) {
          await admin
            .from("subscriptions")
            .update({ active: false })
            .eq("id", sub.id);
          console.log(`Subscription ${sub.id} expired, deactivated`);
          continue;
        }
      }

      // Check if we already credited earnings for today
      console.log(`Checking for existing earnings for subscription ${sub.id} on ${today}`);
      const { data: todayEarning, error: duplicateCheckError } = await admin
        .from("transactions")
        .select("id,created_at,amount_usdt,description")
        .eq("user_id", sub.user_id)
        .eq("type", "earning")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`)
        .maybeSingle();

      if (duplicateCheckError) {
        console.log(`Error checking duplicates for ${sub.id}:`, duplicateCheckError);
      }

      if (todayEarning) {
        console.log(`Already credited earnings for subscription ${sub.id} today:`, todayEarning);
        continue;
      }
      
      console.log(`No existing earnings found for ${sub.id} today - proceeding to credit`);

      console.log(`Processing earnings for subscription ${sub.id}: $${amount}`);

      // Insert earning transaction
      console.log(`Creating earning transaction for ${sub.id}: $${amount}`);
      const { data: txData, error: txErr } = await admin.from("transactions").insert({
        user_id: sub.user_id,
        type: "earning",
        amount_usdt: amount,
        description: `Daily earning from subscription ${sub.id}`,
        status: "completed"
      }).select();
      
      if (txErr) {
        console.log(`Failed to create transaction for ${sub.id}:`, txErr);
        continue;
      }
      
      console.log(`Transaction created successfully for ${sub.id}:`, txData);
      credited += 1;

      // Update balances cache: increment available_usdt
      const { data: balRow } = await admin
        .from("balances")
        .select("available_usdt")
        .eq("user_id", sub.user_id)
        .maybeSingle();
      if (!balRow) {
        await admin.from("balances").insert({
          user_id: sub.user_id,
          available_usdt: amount,
        });
      } else {
        const newBal = Number(balRow.available_usdt || 0) + amount;
        await admin
          .from("balances")
          .update({ available_usdt: newBal })
          .eq("user_id", sub.user_id);
      }

      // Update total_earned in subscription (get current value first)
      const { data: currentSub } = await admin
        .from("subscriptions")
        .select("total_earned")
        .eq("id", sub.id)
        .single();
      
      const newTotalEarned = Number(currentSub?.total_earned || 0) + amount;
      
      await admin
        .from("subscriptions")
        .update({ total_earned: newTotalEarned })
        .eq("id", sub.id);
    }

    return NextResponse.json({ 
      ok: true, 
      credited,
      processed_at: nowIso,
      total_subscriptions: subs?.length || 0,
      active_subscriptions: subs?.filter(s => s.active).length || 0,
      message: `Processed ${credited} earnings out of ${subs?.length || 0} subscriptions`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unexpected error" }, { status: 500 });
  }
}
