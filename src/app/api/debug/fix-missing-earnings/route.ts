import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();

    console.log('🚨 CRITICAL FIX: Processing missing earnings for completed investments...');

    // Get all completed investments with 0 earnings (the bug)
    const { data: completedInvestments, error: fetchError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .eq("total_earned", 0);

    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch completed investments", 
        details: fetchError.message 
      }, { status: 500 });
    }

    console.log(`Found ${completedInvestments?.length || 0} completed investments with missing earnings`);

    let fixedInvestments = [];
    let totalEarningsAdded = 0;
    let errors = [];

    for (const investment of completedInvestments || []) {
      try {
        console.log(`Processing investment ${investment.id}: $${investment.amount_invested} for ${investment.duration_days} days`);

        // Determine payout type and calculate correct earnings
        const isEndPayoutPlan = investment.duration_days >= 30;
        let earningsAmount;
        let earningsDescription;

        if (isEndPayoutPlan) {
          // End payout plans: calculate total earnings
          const totalROI = investment.daily_roi_percentage * investment.duration_days;
          earningsAmount = Number(((investment.amount_invested * totalROI) / 100).toFixed(2));
          earningsDescription = `Investment completed - Total earnings from ${investment.duration_days}-day plan`;
        } else {
          // Daily payout plans: calculate total daily earnings over the period
          const dailyEarning = Number(((investment.amount_invested * investment.daily_roi_percentage) / 100).toFixed(2));
          earningsAmount = Number((dailyEarning * investment.duration_days).toFixed(2));
          earningsDescription = `Investment completed - Total daily earnings from ${investment.duration_days}-day plan`;
        }

        console.log(`Calculated earnings: $${earningsAmount} (${isEndPayoutPlan ? 'End payout' : 'Daily total'})`);

        // Get current user balance
        const { data: currentBalance } = await admin
          .from("user_balances")
          .select("available_balance, total_earned")
          .eq("user_id", user.id)
          .single();

        if (!currentBalance) {
          errors.push(`No balance record found for investment ${investment.id}`);
          continue;
        }

        // Update user balance
        const newAvailableBalance = (currentBalance.available_balance || 0) + earningsAmount;
        const newTotalEarned = (currentBalance.total_earned || 0) + earningsAmount;

        await admin
          .from("user_balances")
          .update({
            available_balance: newAvailableBalance,
            total_earned: newTotalEarned,
            updated_at: now.toISOString()
          })
          .eq("user_id", user.id);

        // Update investment record
        await admin
          .from("user_investments")
          .update({
            total_earned: earningsAmount,
            last_earning_date: now.toISOString().split('T')[0],
            updated_at: now.toISOString()
          })
          .eq("id", investment.id);

        // Create earning record in daily_earnings table
        await admin
          .from("daily_earnings")
          .insert({
            user_id: user.id,
            investment_id: investment.id,
            amount_usdt: earningsAmount,
            earning_date: now.toISOString().split('T')[0]
          });

        // Create transaction log
        const { data: transactionLog } = await admin
          .from("transaction_logs")
          .insert({
            user_id: user.id,
            type: "earning",
            amount_usdt: earningsAmount,
            description: earningsDescription,
            reference_id: investment.id,
            balance_before: currentBalance.available_balance || 0,
            balance_after: newAvailableBalance,
            created_at: now.toISOString()
          })
          .select()
          .single();

        fixedInvestments.push({
          investment_id: investment.id,
          amount_invested: investment.amount_invested,
          duration_days: investment.duration_days,
          daily_roi_percentage: investment.daily_roi_percentage,
          earnings_added: earningsAmount,
          payout_type: isEndPayoutPlan ? 'end' : 'daily_total',
          transaction_id: transactionLog?.id,
          old_balance: currentBalance.available_balance || 0,
          new_balance: newAvailableBalance
        });

        totalEarningsAdded += earningsAmount;

        console.log(`✅ Fixed investment ${investment.id}: Added $${earningsAmount} earnings`);

        // Process referral commission for this fixed earning (5% of earnings)
        try {
          const { data: userProfile } = await admin
            .from("user_profiles")
            .select("referred_by")
            .eq("user_id", user.id)
            .single();

          if (userProfile?.referred_by) {
            const commissionAmount = Number((earningsAmount * 0.05).toFixed(2)); // 5% commission
            
            if (commissionAmount > 0) {
              // Update referrer's balance
              const { data: referrerBalance } = await admin
                .from("user_balances")
                .select("available_balance, total_earned")
                .eq("user_id", userProfile.referred_by)
                .single();

              if (referrerBalance) {
                const newReferrerBalance = (referrerBalance.available_balance || 0) + commissionAmount;
                const newReferrerTotalEarned = (referrerBalance.total_earned || 0) + commissionAmount;

                await admin
                  .from("user_balances")
                  .update({
                    available_balance: newReferrerBalance,
                    total_earned: newReferrerTotalEarned,
                    updated_at: now.toISOString()
                  })
                  .eq("user_id", userProfile.referred_by);

                // Create referral commission record
                await admin
                  .from("referral_commissions")
                  .insert({
                    referrer_user_id: userProfile.referred_by,
                    referred_user_id: user.id,
                    source_type: 'earning_fix',
                    source_amount: earningsAmount,
                    commission_percentage: 5.00,
                    commission_amount: commissionAmount,
                    status: 'paid'
                  });

                // Create transaction log for referrer
                await admin
                  .from("transaction_logs")
                  .insert({
                    user_id: userProfile.referred_by,
                    type: "referral_commission",
                    amount_usdt: commissionAmount,
                    description: `Referral commission (5% of fixed $${earningsAmount})`,
                    reference_id: investment.id,
                    balance_before: referrerBalance.available_balance || 0,
                    balance_after: newReferrerBalance,
                    created_at: now.toISOString()
                  });

                console.log(`✅ Paid referral commission: $${commissionAmount} to referrer ${userProfile.referred_by}`);
              }
            }
          }
        } catch (referralError: any) {
          console.warn(`Referral commission failed for investment ${investment.id}:`, referralError.message);
          // Non-fatal error - don't stop earnings processing
        }

      } catch (error: any) {
        console.error(`Error processing investment ${investment.id}:`, error);
        errors.push(`Investment ${investment.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Missing earnings processed successfully",
      results: {
        total_investments_fixed: fixedInvestments.length,
        total_earnings_added: Number(totalEarningsAdded.toFixed(2)),
        fixed_investments: fixedInvestments,
        errors: errors.length > 0 ? errors : undefined
      },
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('Fix missing earnings error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
