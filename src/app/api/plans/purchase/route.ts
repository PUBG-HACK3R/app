import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PurchaseSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  customAmount: z.number().positive("Custom amount must be positive").optional(),
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
    
    const { planId, customAmount } = PurchaseSchema.parse(body);
    console.log("Purchase API - Parsed planId:", planId);

    const admin = getSupabaseAdminClient();

    // Get plan details
    console.log("Purchase API - Querying plan with ID:", planId);
    const { data: plan, error: planError } = await admin
      .from("investment_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();
    
    console.log("Purchase API - Plan query result:", { plan, planError });

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Allow multiple active subscriptions - removed restriction

    // Get current balance from("user_balances") table
    console.log("Purchase API - Checking balance for user:", user.id);
    const { data: balanceData, error: balanceError } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("Purchase API - Balance query result:", { balanceData, balanceError });

    const currentBalance = Number(balanceData?.available_balance || 0);
    const planPrice = customAmount ? Number(customAmount) : Number(plan.min_amount);
    
    // Validate custom amount is within plan limits
    if (customAmount) {
      if (customAmount < plan.min_amount || customAmount > plan.max_amount) {
        return NextResponse.json({ 
          error: "Invalid investment amount", 
          message: `Amount must be between $${plan.min_amount} and $${plan.max_amount}`,
          min_amount: plan.min_amount,
          max_amount: plan.max_amount
        }, { status: 400 });
      }
    }
    
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
      .from("user_profiles")
      .upsert({ 
        user_id: user.id, 
        email: user.email || "", 
        role: "user" 
      }, { onConflict: "user_id" });

    // Create subscription with actual timestamp (not just date)
    const now = new Date();
    const startDate = new Date(now); // Use actual current time
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    // Calculate daily earning based on plan
    const dailyEarning = (planPrice * plan.daily_roi_percentage) / 100;

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

    // Set next earning time based on plan duration
    const nextEarningTime = new Date();
    const isEndPayoutPlan = plan.duration_days >= 30; // Monthly and Bi-Monthly plans
    
    if (isEndPayoutPlan) {
      // End payout plans: set next earning to the end date
      nextEarningTime.setTime(endDate.getTime());
    } else {
      // Daily payout plans: set next earning to 24 hours from now
      nextEarningTime.setDate(nextEarningTime.getDate() + 1);
    }

    const { data: subscription, error: subError } = await admin
      .from("user_investments")
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount_invested: planPrice,
        daily_roi_percentage: plan.daily_roi_percentage,
        duration_days: plan.duration_days,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        total_earned: 0,
        next_earning_time: nextEarningTime.toISOString(),
        investment_time: now.toISOString()
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

    // Update balance in balances table after successful purchase
    // Move money from available_balance to locked_balance
    const { data: currentBalanceData } = await admin
      .from("user_balances")
      .select("available_balance, locked_balance")
      .eq("user_id", user.id)
      .single();

    const newAvailableBalance = (currentBalanceData?.available_balance || 0) - planPrice;
    const newLockedBalance = (currentBalanceData?.locked_balance || 0) + planPrice;

    // Create investment transaction for the plan purchase
    const { error: txError } = await admin
      .from("transaction_logs")
      .insert({
        user_id: user.id,
        type: "investment",
        amount_usdt: -planPrice, // Negative because it's a deduction
        description: `Purchased ${plan.name} plan - ${plan.duration_days} days at ${plan.daily_roi_percentage}% ${plan.payout_type === 'end' ? 'total' : 'daily'} ROI`,
        reference_id: subscription.id,
        balance_before: currentBalance,
        balance_after: (currentBalanceData?.available_balance || 0) - planPrice
      });

    if (txError) {
      console.error("Error creating transaction:", txError);
      // Don't fail the request, but log the error
    }

    const { error: balanceUpdateError } = await admin
      .from("user_balances")
      .update({
        available_balance: newAvailableBalance,
        locked_balance: newLockedBalance
      })
      .eq("user_id", user.id);

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
        daily_roi_percentage: subscription.daily_roi_percentage,
        payout_type: subscription.payout_type,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        duration_days: plan.duration_days
      },
      new_balance: newAvailableBalance
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
