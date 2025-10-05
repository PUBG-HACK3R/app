import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using profiles table
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Find subscriptions that are active and due for earning credit
    let query = admin
      .from("subscriptions")
      .select(
        "id,user_id,principal_usdt,roi_daily_percent,start_date,end_date,active,next_earning_at"
      )
      .eq("active", true)
      .or(`next_earning_at.is.null,next_earning_at.lte.${nowIso}`);

    const { data: subs, error: subsErr } = await query;
    if (subsErr) {
      return NextResponse.json({ error: subsErr.message }, { status: 500 });
    }

    let credited = 0;
    let processed = 0;
    let errors = [];

    for (const sub of subs || []) {
      processed++;
      
      // Compute daily earning amount
      const principal = Number(sub.principal_usdt || 0);
      const roiDaily = Number(sub.roi_daily_percent || 0);
      if (!principal || !roiDaily) {
        errors.push(`Subscription ${sub.id}: Invalid principal or ROI`);
        continue;
      }

      // If subscription has ended, deactivate and skip credit
      if (sub.end_date) {
        const endDate = new Date(sub.end_date as string);
        const todayDate = new Date(`${today}T00:00:00.000Z`);
        if (todayDate > endDate) {
          await admin
            .from("subscriptions")
            .update({ active: false })
            .eq("id", sub.id);
          errors.push(`Subscription ${sub.id}: Ended, deactivated`);
          continue;
        }
      }

      const amount = Number((principal * (roiDaily / 100)).toFixed(2));

      // Insert earning transaction
      const { error: txErr } = await admin.from("transactions").insert({
        user_id: sub.user_id,
        type: "earning",
        amount_usdt: amount,
        reference_id: sub.id,
        meta: { source: "admin_manual", credited_at: nowIso },
      });
      
      if (txErr) {
        errors.push(`Subscription ${sub.id}: Transaction failed - ${txErr.message}`);
        continue;
      }

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

      // Advance next_earning_at by 1 day
      const currentNext = sub.next_earning_at ? new Date(sub.next_earning_at) : now;
      // Ensure we always move at least one day forward from "now"
      const base = currentNext > now ? currentNext : now;
      const next = new Date(base);
      next.setUTCDate(base.getUTCDate() + 1);

      // Determine if subscription should remain active
      let stillActive = true;
      if (sub.end_date) {
        const endDate = new Date(sub.end_date as string);
        const todayDate = new Date(`${today}T00:00:00.000Z`);
        if (todayDate > endDate) {
          stillActive = false;
        }
      }

      await admin
        .from("subscriptions")
        .update({ next_earning_at: next.toISOString(), active: stillActive })
        .eq("id", sub.id);
    }

    return NextResponse.json({ 
      success: true,
      processed,
      credited,
      errors,
      message: `Processed ${processed} subscriptions, credited ${credited} earnings`
    });

  } catch (err: any) {
    console.error("Manual earnings processing error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
