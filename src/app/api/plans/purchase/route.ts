import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PurchaseSchema = z.object({
  planId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = PurchaseSchema.parse(body);

    const admin = getSupabaseAdminClient();

    // Get plan details
    const { data: plan, error: planError } = await admin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Check if user already has an active subscription
    const { data: activeSub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (activeSub) {
      return NextResponse.json({ error: "You already have an active subscription" }, { status: 400 });
    }

    // Get current balance from balances table
    const { data: balanceData } = await admin
      .from("balances")
      .select("available_usdt")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentBalance = Number(balanceData?.available_usdt || 0);
    const planPrice = Number(plan.price_usdt);

    if (currentBalance < planPrice) {
      return NextResponse.json({ 
        error: "Insufficient balance", 
        required: planPrice,
        available: currentBalance,
        shortfall: planPrice - currentBalance
      }, { status: 400 });
    }

    // Ensure profile exists
    await admin
      .from("profiles")
      .upsert({ 
        user_id: user.id, 
        email: user.email || "", 
        role: "user" 
      }, { onConflict: "user_id" });

    // Create subscription
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + plan.duration_days);
    const nextEarningAt = new Date(startDate);
    nextEarningAt.setUTCDate(nextEarningAt.getUTCDate() + 1);

    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        principal_usdt: planPrice,
        roi_daily_percent: plan.roi_daily_percent,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        active: true,
        next_earning_at: nextEarningAt.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error("Error creating subscription:", subError);
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    // Create withdrawal transaction for the plan purchase
    const { error: txError } = await admin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount_usdt: planPrice,
        reference_id: subscription.id,
        meta: { 
          plan_purchase: true,
          plan_id: planId,
          plan_name: plan.name,
          subscription_id: subscription.id,
          timestamp: new Date().toISOString()
        },
      });

    if (txError) {
      console.error("Error creating transaction:", txError);
      // Don't fail the request, but log the error
    }

    // Update balance
    const newBalance = currentBalance - planPrice;
    const { error: balanceError } = await admin
      .from("balances")
      .update({ available_usdt: newBalance })
      .eq("user_id", user.id);

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${plan.name} plan`,
      subscription: {
        id: subscription.id,
        plan_name: plan.name,
        amount: planPrice,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        daily_roi: plan.roi_daily_percent,
        duration_days: plan.duration_days
      },
      new_balance: newBalance
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    console.error("Plan purchase error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
