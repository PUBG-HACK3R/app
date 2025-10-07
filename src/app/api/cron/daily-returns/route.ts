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
    // Individual 24-hour timing using created_at and transaction history
    let query = admin
      .from("subscriptions")
      .select(
        "id,user_id,amount_invested,daily_earning,start_date,end_date,active,created_at"
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

      // Individual 24-hour timing using transaction history
      const createdAt = new Date(sub.created_at);
      
      // Get the last earning transaction for this subscription
      const { data: lastEarning } = await admin
        .from("transactions")
        .select("created_at")
        .eq("user_id", sub.user_id)
        .eq("type", "earning")
        .like("description", `%${sub.id}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let nextEarningTime;
      if (!lastEarning) {
        // First earning: 24 hours after subscription creation
        nextEarningTime = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000));
        console.log(`Subscription ${sub.id} first earning scheduled for: ${nextEarningTime.toISOString()}`);
      } else {
        // Next earning: 24 hours after last earning
        const lastEarningTime = new Date(lastEarning.created_at);
        nextEarningTime = new Date(lastEarningTime.getTime() + (24 * 60 * 60 * 1000));
        console.log(`Subscription ${sub.id} next earning scheduled for: ${nextEarningTime.toISOString()} (24h after last earning)`);
      }
      
      // Check if it's time for earning
      if (now < nextEarningTime) {
        console.log(`Subscription ${sub.id} not ready yet - skipping`);
        continue;
      }
      
      console.log(`Subscription ${sub.id} is ready for earning at ${now.toISOString()}`);

      // If subscription has ended, deactivate and skip credit
      if (sub.end_date) {
        const endDate = new Date(sub.end_date as string);
        if (now > endDate) {
          await admin
            .from("subscriptions")
            .update({ active: false })
            .eq("id", sub.id);
          console.log(`Subscription ${sub.id} expired, deactivated`);
          continue;
        }
      }

      // Individual timing means no need for daily duplicate check
      // Each subscription earns exactly 24 hours after previous earning

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

      // Update subscription total_earned
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
        
      console.log(`Subscription ${sub.id} total_earned updated to: $${newTotalEarned}`);
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
