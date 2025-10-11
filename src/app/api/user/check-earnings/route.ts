import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Check user authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get user's active investments
    const { data: investments, error: investmentError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (investmentError) {
      console.error("Error fetching user investments:", investmentError);
      return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 });
    }

    let processedCount = 0;
    let completedCount = 0;
    let totalEarningsAdded = 0;
    let totalPrincipalReturned = 0;
    const errors = [];

    for (const investment of investments || []) {
      try {
        // Check if investment has ended
        const endDate = new Date(investment.end_date);
        const isCompleted = now >= endDate;

        if (isCompleted) {
          // Complete the investment and return principal + earnings
          await admin
            .from("user_investments")
            .update({ status: "completed" })
            .eq("id", investment.id);

          // Get current user balance
          const { data: currentBalance } = await admin
            .from("user_balances")
            .select("available_balance, locked_balance")
            .eq("user_id", user.id)
            .single();

          if (currentBalance) {
            // Return locked amount to available balance
            const newAvailableBalance = (currentBalance.available_balance || 0) + investment.amount_invested;
            const newLockedBalance = Math.max(0, (currentBalance.locked_balance || 0) - investment.amount_invested);

            await admin
              .from("user_balances")
              .update({
                available_balance: newAvailableBalance,
                locked_balance: newLockedBalance,
                updated_at: now.toISOString()
              })
              .eq("user_id", user.id);

            // Log the principal return transaction
            await admin
              .from("transaction_logs")
              .insert({
                user_id: user.id,
                type: "investment_return",
                amount_usdt: investment.amount_invested,
                description: `Investment completed - Principal returned`,
                reference_id: investment.id,
                balance_before: currentBalance.available_balance,
                balance_after: newAvailableBalance
              });

            totalPrincipalReturned += investment.amount_invested;
            completedCount++;
          }
          continue;
        }

        // Check if earnings are due (next_earning_time is null or in the past)
        const nextEarningTime = investment.next_earning_time ? new Date(investment.next_earning_time) : null;
        const isDueForEarning = !nextEarningTime || now >= nextEarningTime;

        if (!isDueForEarning) {
          continue; // Not due for earning yet
        }

        // Check if earnings already processed for today
        const { data: existingEarning } = await admin
          .from("daily_earnings")
          .select("id")
          .eq("investment_id", investment.id)
          .eq("earning_date", today)
          .single();

        if (existingEarning) {
          // Update next earning time to tomorrow
          const nextEarning = new Date(now);
          nextEarning.setDate(nextEarning.getDate() + 1);
          nextEarning.setHours(0, 0, 0, 0); // Set to midnight
          
          await admin
            .from("user_investments")
            .update({ next_earning_time: nextEarning.toISOString() })
            .eq("id", investment.id);
          
          continue; // Already processed today
        }

        // Calculate daily earning
        const dailyEarning = Number(((investment.amount_invested * investment.daily_roi_percentage) / 100).toFixed(2));

        // Create earning record
        const { data: earning, error: earningError } = await admin
          .from("daily_earnings")
          .insert({
            user_id: user.id,
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
          .eq("user_id", user.id)
          .single();

        const newAvailableBalance = (currentBalance?.available_balance || 0) + dailyEarning;
        const newTotalEarned = (currentBalance?.total_earned || 0) + dailyEarning;

        await admin
          .from("user_balances")
          .update({
            available_balance: newAvailableBalance,
            total_earned: newTotalEarned,
            updated_at: now.toISOString()
          })
          .eq("user_id", user.id);

        // Set next earning time to 24 hours from now
        const nextEarningTime24h = new Date(now);
        nextEarningTime24h.setHours(nextEarningTime24h.getHours() + 24);

        // Update investment
        await admin
          .from("user_investments")
          .update({
            total_earned: (investment.total_earned || 0) + dailyEarning,
            last_earning_date: today,
            next_earning_time: nextEarningTime24h.toISOString()
          })
          .eq("id", investment.id);

        // Log transaction
        await admin
          .from("transaction_logs")
          .insert({
            user_id: user.id,
            type: "earning",
            amount_usdt: dailyEarning,
            description: `Daily earning from investment`,
            reference_id: earning.id,
            balance_before: currentBalance?.available_balance || 0,
            balance_after: newAvailableBalance
          });

        totalEarningsAdded += dailyEarning;
        processedCount++;

        console.log(`✅ Processed earning for user ${user.id}, investment ${investment.id}: $${dailyEarning}`);

      } catch (error: any) {
        console.error(`Error processing investment ${investment.id}:`, error);
        errors.push(`Error processing investment ${investment.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Earnings check completed",
      results: {
        totalInvestments: investments?.length || 0,
        earningsProcessed: processedCount,
        investmentsCompleted: completedCount,
        totalEarningsAdded: Number(totalEarningsAdded.toFixed(2)),
        totalPrincipalReturned: Number(totalPrincipalReturned.toFixed(2)),
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined
      }
    });

  } catch (err: any) {
    console.error("Check earnings error:", err);
    return NextResponse.json({ 
      error: "Earnings check failed", 
      details: err.message 
    }, { status: 500 });
  }
}
