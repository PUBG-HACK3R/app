import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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

    // Force earning for the $100 subscription that's not earning
    const targetSubId = "9e5a69cb-1155-4f08-b717-ac9cb4d92ea3";
    const targetUserId = "f5f5728e-6a8d-46f3-9d25-5e1eea2a3e86";
    
    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .select("*")
      .eq("id", targetSubId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ 
        error: "Subscription not found",
        details: subError 
      }, { status: 404 });
    }

    const amount = Number(subscription.daily_earning || 0);
    if (!amount) {
      return NextResponse.json({ 
        error: "No daily earning amount configured" 
      }, { status: 400 });
    }

    // Create earning transaction
    const { data: txData, error: txErr } = await admin.from("transactions").insert({
      user_id: targetUserId,
      type: "earning",
      amount_usdt: amount,
      description: `Daily earning from subscription ${targetSubId} (MANUAL FORCE)`,
      status: "completed"
    }).select();
    
    if (txErr) {
      return NextResponse.json({ 
        error: "Failed to create transaction", 
        details: txErr 
      }, { status: 500 });
    }

    // Update balance
    const { data: balRow } = await admin
      .from("balances")
      .select("available_usdt")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!balRow) {
      await admin.from("balances").insert({
        user_id: targetUserId,
        available_usdt: amount,
      });
    } else {
      const newBal = Number(balRow.available_usdt || 0) + amount;
      await admin
        .from("balances")
        .update({ available_usdt: newBal })
        .eq("user_id", targetUserId);
    }

    // Update subscription total_earned
    const { data: currentSub } = await admin
      .from("subscriptions")
      .select("total_earned")
      .eq("id", targetSubId)
      .single();
    
    const newTotalEarned = Number(currentSub?.total_earned || 0) + amount;
    
    await admin
      .from("subscriptions")
      .update({ total_earned: newTotalEarned })
      .eq("id", targetSubId);

    return NextResponse.json({
      success: true,
      message: "Manual earning forced successfully!",
      transaction: txData,
      subscription_id: targetSubId,
      amount_credited: amount,
      new_total_earned: newTotalEarned,
      note: "This was a manual force to test the earning system"
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Force earning failed",
      message: error.message
    }, { status: 500 });
  }
}
