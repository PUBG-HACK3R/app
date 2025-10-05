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

    // Get current balance from transactions
    const { data: allTx } = await admin
      .from("transactions")
      .select("type, amount_usdt")
      .eq("user_id", user.id);

    const totalEarnings = (allTx || [])
      .filter((t) => t.type === "earning")
      .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
    const totalDeposits = (allTx || [])
      .filter((t) => t.type === "deposit")
      .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
    const totalInvestments = (allTx || [])
      .filter((t) => t.type === "investment")
      .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
    const totalReturns = (allTx || [])
      .filter((t) => t.type === "investment_return")
      .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
    const totalWithdrawals = (allTx || [])
      .filter((t) => t.type === "withdrawal")
      .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
    
    const currentBalance = totalDeposits + totalEarnings + totalReturns - totalInvestments - totalWithdrawals;
    const planPrice = Number(plan.min_amount);

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

    // No need to update profiles table balance since we calculate from transactions
    const newBalance = currentBalance - planPrice;

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
