import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Check admin authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using admin client (more reliable)
    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json({ 
        error: "Failed to fetch user profile", 
        details: profileError.message 
      }, { status: 500 });
    }

    console.log("User profile:", { userId: user.id, role: profile?.role });

    if (profile?.role !== "admin") {
      return NextResponse.json({ 
        error: "Admin access required", 
        details: `Current role: ${profile?.role || 'none'}. Please ensure your role is set to 'admin' in the database.` 
      }, { status: 403 });
    }

    // Process daily returns using the same admin client
    const now = new Date();
    const nowIso = now.toISOString();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Find subscriptions that are active and due for earning credit
    const { data: subs, error: subsErr } = await admin
      .from("user_investments")
      .select(
        "id,user_id,amount_invested,daily_roi_percentage,start_date,end_date,active,next_earning_at"
      )
      .eq("active", true)
      .or(`next_earning_at.is.null,next_earning_at.lte.${nowIso}`);

    if (subsErr) {
      return NextResponse.json({ 
        error: "Failed to fetch subscriptions", 
        details: subsErr.message 
      }, { status: 500 });
    }

    let credited = 0;
    let deactivated = 0;
    const errors = [];
    let totalAmount = 0;

    for (const sub of subs || []) {
      try {
        // Compute daily earning amount
        const principal = Number(sub.amount_invested || 0);
        const roiDaily = Number(sub.daily_roi_percentage || 0);
        if (!principal || !roiDaily) continue;

        // Check if subscription has ended
        if (sub.end_date) {
          const endDate = new Date(sub.end_date as string);
          const todayDate = new Date(`${today}T00:00:00.000Z`);
          if (todayDate > endDate) {
            await admin
              .from("user_investments")
              .update({ active: false })
              .eq("id", sub.id);
            deactivated++;
            continue;
          }
        }

        const amount = Number((principal * (roiDaily / 100)).toFixed(2));

        // Insert earning transaction
        const { error: txErr } = await admin.from("transaction_logs").insert({
          user_id: sub.user_id,
          type: "earning",
          amount_usdt: amount,
          reference_id: sub.id,
          meta: { 
            source: "admin_manual", 
            credited_at: nowIso,
            admin_id: user.id 
          },
        });

        if (txErr) {
          errors.push(`Failed to create transaction for subscription ${sub.id}: ${txErr.message}`);
          continue;
        }

        credited += 1;
        totalAmount += amount;

        // Update balances cache: increment available_balance
        const { data: balRow } = await admin
          .from("user_balances")
          .select("available_balance")
          .eq("user_id", sub.user_id)
          .maybeSingle();

        if (!balRow) {
          await admin.from("user_balances").insert({
            user_id: sub.user_id,
            available_balance: amount,
          });
        } else {
          const newBal = Number(balRow.available_balance || 0) + amount;
          await admin
            .from("user_balances")
            .update({ available_balance: newBal })
            .eq("user_id", sub.user_id);
        }

        // Advance next_earning_at by 1 day
        const currentNext = sub.next_earning_at ? new Date(sub.next_earning_at) : now;
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
            deactivated++;
          }
        }

        await admin
          .from("user_investments")
          .update({ 
            next_earning_at: next.toISOString(), 
            active: stillActive 
          })
          .eq("id", sub.id);

      } catch (error: any) {
        errors.push(`Error processing subscription ${sub.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daily returns processed successfully",
      results: {
        subscriptionsProcessed: subs?.length || 0,
        earningsCredited: credited,
        subscriptionsDeactivated: deactivated,
        totalAmountCredited: totalAmount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Daily returns processing failed", 
      details: err.message 
    }, { status: 500 });
  }
}
