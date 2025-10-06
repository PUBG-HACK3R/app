import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PurchaseSchema = z.object({
  planId: z.union([
    z.string().regex(/^\d+$/, "Plan ID must be a valid integer string"),
    z.number().int().positive("Plan ID must be a positive integer")
  ]).transform(val => String(val)),
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
    console.log("Purchase API - Received body:", body);
    console.log("Purchase API - Body type:", typeof body);
    console.log("Purchase API - planId:", body.planId);
    console.log("Purchase API - planId type:", typeof body.planId);
    
    const { planId } = PurchaseSchema.parse(body);
    console.log("Purchase API - Parsed planId:", planId);

    const admin = getSupabaseAdminClient();

    // Get plan details
    console.log("Purchase API - Querying plan with ID:", planId);
    const { data: plan, error: planError } = await admin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();
    
    console.log("Purchase API - Plan query result:", { plan, planError });

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
    console.log("Purchase API - Checking balance for user:", user.id);
    const { data: balanceData, error: balanceError } = await admin
      .from("balances")
      .select("available_usdt")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("Purchase API - Balance query result:", { balanceData, balanceError });

    const currentBalance = Number(balanceData?.available_usdt || 0);
    const planPrice = Number(plan.min_amount);
    
    console.log("Purchase API - Balance check:", { currentBalance, planPrice, hasEnough: currentBalance >= planPrice });

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

    // Calculate daily earning based on plan
    const dailyEarning = (planPrice * plan.roi_daily_percent) / 100;

    console.log("Purchase API - Creating subscription with data:", {
      id: crypto.randomUUID(),
      user_id: user.id,
      plan_id: parseInt(planId),
      amount_invested: planPrice,
      daily_earning: dailyEarning,
      total_earned: 0,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      active: true,
    });

    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        plan_id: parseInt(planId),
        amount_invested: planPrice,
        daily_earning: dailyEarning,
        total_earned: 0,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        active: true,
      })
      .select()
      .single();

    if (subError) {
      console.error("Error creating subscription:", subError);
      console.error("Subscription error details:", {
        message: subError.message,
        details: subError.details,
        hint: subError.hint,
        code: subError.code
      });
      return NextResponse.json({ 
        error: "Failed to create subscription", 
        details: subError.message,
        code: subError.code 
      }, { status: 500 });
    }

    // Create investment transaction for the plan purchase
    const { error: txError } = await admin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "investment",
        amount_usdt: planPrice,
        status: "completed",
        description: `Purchased ${plan.name} mining plan - ${plan.duration_days} days at ${plan.roi_daily_percent}% daily ROI`,
      });

    if (txError) {
      console.error("Error creating transaction:", txError);
      // Don't fail the request, but log the error
    }

    // Update balance in balances table after successful purchase
    const newBalance = currentBalance - planPrice;
    const { error: balanceUpdateError } = await admin
      .from("balances")
      .upsert({
        user_id: user.id,
        available_usdt: newBalance
      }, { onConflict: "user_id" });

    if (balanceUpdateError) {
      console.error("Error updating balance:", balanceUpdateError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${plan.name} plan`,
      subscription: {
        id: subscription.id,
        plan_name: plan.name,
        amount_invested: subscription.amount_invested,
        daily_earning: subscription.daily_earning,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        duration_days: plan.duration_days
      },
      new_balance: newBalance
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error("Validation error:", err.issues);
      return NextResponse.json({ 
        error: "Invalid payload", 
        issues: err.issues,
        details: `Validation failed: ${err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
      }, { status: 400 });
    }
    console.error("Plan purchase error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
