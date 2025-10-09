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

    // Check if this is the user with missing $100 subscription
    if (user.id !== "f5f5728e-6a8d-46f3-9d25-5e1eea2a3e86") {
      return NextResponse.json({ 
        error: "This fix is only for the specific user with missing $100 subscription",
        your_user_id: user.id 
      }, { status: 400 });
    }

    // Get the $100 plan purchase transaction
    const { data: purchaseTransaction } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "investment")
      .eq("amount_usdt", 100)
      .eq("description", "Purchased Basic Bitcoin Miner mining plan - 10 days at 2% daily ROI")
      .single();

    if (!purchaseTransaction) {
      return NextResponse.json({ 
        error: "Could not find the $100 plan purchase transaction" 
      }, { status: 404 });
    }

    // Get Basic Bitcoin Miner plan details (plan_id: 9 based on $100 investment)
    const { data: plan } = await admin
      .from("investment_plans")
      .select("*")
      .eq("name", "Basic Bitcoin Miner")
      .single();

    if (!plan) {
      return NextResponse.json({ 
        error: "Could not find Basic Bitcoin Miner plan" 
      }, { status: 404 });
    }

    // Create the missing subscription
    const purchaseDate = new Date(purchaseTransaction.created_at);
    const startDate = new Date(Date.UTC(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth(), purchaseDate.getUTCDate()));
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + plan.duration_days);

    // Calculate daily earning: $100 * 2% = $2
    const dailyEarning = (100 * plan.daily_roi_percentage) / 100;

    const subscriptionData = {
      id: crypto.randomUUID(),
      user_id: user.id,
      plan_id: plan.id,
      amount_invested: 100,
      daily_earning: dailyEarning,
      total_earned: 0,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      active: true,
      created_at: purchaseTransaction.created_at // Use original purchase time
    };

    // Insert the missing subscription
    const { data: newSubscription, error: subError } = await admin
      .from("user_investments")
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) {
      return NextResponse.json({ 
        error: "Failed to create subscription", 
        details: subError 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Missing $100 subscription created successfully!",
      subscription: newSubscription,
      plan_details: plan,
      purchase_transaction: purchaseTransaction,
      daily_earning: dailyEarning,
      next_steps: [
        "The $100 Basic Bitcoin Miner subscription is now active",
        "It will start earning $2.00 daily based on individual 24-hour timing",
        "First earning will be 24 hours after the original purchase time",
        "Run the cron job to process any pending earnings"
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to create missing subscription",
      message: error.message
    }, { status: 500 });
  }
}
