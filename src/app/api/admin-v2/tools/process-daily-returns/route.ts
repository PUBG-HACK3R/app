import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get active investments that are due for earnings
    const { data: investments, error } = await admin
      .from("user_investments")
      .select("*")
      .eq("status", "active")
      .lte("next_earning_time", now.toISOString());

    if (error) {
      console.error("Error fetching investments:", error);
      return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 });
    }

    let processedCount = 0;
    const errors = [];

    for (const investment of investments || []) {
      try {
        // Check if earnings already processed for today
        const { data: existingEarning } = await admin
          .from("daily_earnings")
          .select("id")
          .eq("investment_id", investment.id)
          .eq("earning_date", today)
          .single();

        if (existingEarning) {
          // Update next earning time to tomorrow
          const nextEarning = new Date(investment.next_earning_time);
          nextEarning.setDate(nextEarning.getDate() + 1);
          
          await admin
            .from("user_investments")
            .update({ next_earning_time: nextEarning.toISOString() })
            .eq("id", investment.id);
          
          continue; // Already processed
        }

        // Calculate daily earning
        const dailyEarning = (investment.amount_invested * investment.daily_roi_percentage) / 100;

        // Create earning record
        const { data: earning, error: earningError } = await admin
          .from("daily_earnings")
          .insert({
            user_id: investment.user_id,
            investment_id: investment.id,
            amount_usdt: dailyEarning,
            earning_date: today
          })
          .select()
          .single();

        if (earningError) {
          console.error("Error creating daily earning:", earningError);
          errors.push(`Failed to create earning for investment ${investment.id}`);
          continue;
        }

        // Update user balance
        const { data: currentBalance } = await admin
          .from("user_balances")
          .select("available_balance, total_earned")
          .eq("user_id", investment.user_id)
          .single();

        await admin
          .from("user_balances")
          .update({
            available_balance: (currentBalance?.available_balance || 0) + dailyEarning,
            total_earned: (currentBalance?.total_earned || 0) + dailyEarning,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", investment.user_id);

        // Set next earning time to 24 hours from now
        const nextEarningTime = new Date(now);
        nextEarningTime.setHours(nextEarningTime.getHours() + 24);

        // Update investment
        await admin
          .from("user_investments")
          .update({
            total_earned: investment.total_earned + dailyEarning,
            last_earning_date: today,
            next_earning_time: nextEarningTime.toISOString()
          })
          .eq("id", investment.id);

        // Log transaction
        await admin
          .from("transaction_logs")
          .insert({
            user_id: investment.user_id,
            type: "earning",
            amount_usdt: dailyEarning,
            description: `Daily earning from investment`,
            reference_id: earning.id,
            balance_before: currentBalance?.available_balance || 0,
            balance_after: (currentBalance?.available_balance || 0) + dailyEarning
          });

        // Check if investment is completed
        if (today >= investment.end_date) {
          await admin
            .from("user_investments")
            .update({ status: "completed" })
            .eq("id", investment.id);

          // Move locked balance back to available
          const { data: userBalance } = await admin
            .from("user_balances")
            .select("available_balance, locked_balance")
            .eq("user_id", investment.user_id)
            .single();

          if (userBalance) {
            await admin
              .from("user_balances")
              .update({
                available_balance: userBalance.available_balance + investment.amount_invested,
                locked_balance: userBalance.locked_balance - investment.amount_invested
              })
              .eq("user_id", investment.user_id);
          }
        }

        processedCount++;
        console.log(`✅ Processed earning for investment ${investment.id}: $${dailyEarning}`);

      } catch (error: any) {
        console.error(`Error processing investment ${investment.id}:`, error);
        errors.push(`Error processing investment ${investment.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daily returns processed successfully",
      processed: processedCount,
      totalInvestments: investments?.length || 0,
      errors: errors.slice(0, 5) // Limit error output
    });

  } catch (error: any) {
    console.error("Process daily returns error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
