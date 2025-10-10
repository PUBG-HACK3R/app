import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// User-triggered earnings check - processes earnings when user visits dashboard
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "Authentication required" 
      }, { status: 401 });
    }

    const adminClient = getSupabaseAdminClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get user's investments that are due for earnings
    const { data: investments, error } = await adminClient
      .from('user_investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lte('next_earning_time', now.toISOString());

    if (error || !investments) {
      return NextResponse.json({ 
        success: false,
        error: "Failed to check investments" 
      }, { status: 500 });
    }

    let processedCount = 0;
    let totalEarned = 0;

    // Process each due investment
    for (const investment of investments) {
      try {
        // Check if already processed today
        const { data: existingEarning } = await adminClient
          .from('daily_earnings')
          .select('id')
          .eq('investment_id', investment.id)
          .eq('earning_date', today)
          .single();

        if (existingEarning) {
          // Already processed, just update next earning time
          const nextEarning = new Date(investment.next_earning_time);
          nextEarning.setDate(nextEarning.getDate() + 1);
          
          await adminClient
            .from('user_investments')
            .update({ next_earning_time: nextEarning.toISOString() })
            .eq('id', investment.id);
          
          continue;
        }

        // Calculate earning based on plan duration (determine payout type)
        let dailyEarning = 0;
        const isEndPayoutPlan = investment.duration_days >= 30; // Monthly and Bi-Monthly plans
        
        if (!isEndPayoutPlan) {
          // Daily payout plans (1, 3, 10 days) - pay daily ROI
          dailyEarning = (investment.amount_invested * investment.daily_roi_percentage) / 100;
        } else {
          // End payout plans (30, 60 days) - only pay at the end
          if (today >= investment.end_date) {
            // Calculate total return: investment * (percentage / 100)
            // For monthly: 120% means user gets 120% of their investment as profit
            // For bi-monthly: 150% means user gets 150% of their investment as profit
            dailyEarning = (investment.amount_invested * investment.daily_roi_percentage) / 100;
          } else {
            // Skip earning for end-payout plans until completion
            const nextEarning = new Date(investment.end_date);
            await adminClient
              .from('user_investments')
              .update({ next_earning_time: nextEarning.toISOString() })
              .eq('id', investment.id);
            continue;
          }
        }

        // Create earning record
        const { data: earning, error: earningError } = await adminClient
          .from('daily_earnings')
          .insert({
            user_id: user.id,
            investment_id: investment.id,
            amount_usdt: dailyEarning,
            earning_date: today
          })
          .select()
          .single();

        if (earningError) continue;

        // Update user balance
        const { data: balance } = await adminClient
          .from('user_balances')
          .select('available_balance, total_earned')
          .eq('user_id', user.id)
          .single();

        if (balance) {
          await adminClient
            .from('user_balances')
            .update({
              available_balance: balance.available_balance + dailyEarning,
              total_earned: balance.total_earned + dailyEarning
            })
            .eq('user_id', user.id);
        }

        // Set next earning time
        const nextEarningTime = new Date(investment.next_earning_time);
        nextEarningTime.setDate(nextEarningTime.getDate() + 1);

        // Update investment
        await adminClient
          .from('user_investments')
          .update({
            total_earned: investment.total_earned + dailyEarning,
            last_earning_date: today,
            next_earning_time: nextEarningTime.toISOString()
          })
          .eq('id', investment.id);

        // Log transaction
        await adminClient
          .from('transaction_logs')
          .insert({
            user_id: user.id,
            type: 'earning',
            amount_usdt: dailyEarning,
            description: `Daily earning from investment`,
            reference_id: earning.id,
            balance_before: balance?.available_balance || 0,
            balance_after: (balance?.available_balance || 0) + dailyEarning
          });

        // Check if investment completed
        if (today >= investment.end_date) {
          await adminClient
            .from('user_investments')
            .update({ status: 'completed' })
            .eq('id', investment.id);

          // Move locked balance back to available
          const { data: currentBalance } = await adminClient
            .from('user_balances')
            .select('available_balance, locked_balance')
            .eq('user_id', user.id)
            .single();

          if (currentBalance) {
            await adminClient
              .from('user_balances')
              .update({
                available_balance: currentBalance.available_balance + investment.amount_invested,
                locked_balance: currentBalance.locked_balance - investment.amount_invested
              })
              .eq('user_id', user.id);
          }
        }

        processedCount++;
        totalEarned += dailyEarning;

      } catch (error) {
        console.error(`Error processing investment ${investment.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total_earned: totalEarned,
      message: processedCount > 0 ? `Processed ${processedCount} earnings totaling $${totalEarned.toFixed(2)}` : 'No earnings due'
    });

  } catch (error) {
    console.error("Earnings check error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to check earnings" 
    }, { status: 500 });
  }
}
