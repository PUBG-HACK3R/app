import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Check admin authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ 
        error: "Admin access required" 
      }, { status: 403 });
    }

    console.log('🔧 Manual refund of expired withdrawals initiated by admin:', user.id);
    
    // Find withdrawals that are expired and haven't been refunded yet
    const { data: expiredWithdrawals, error: fetchError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("status", "expired");

    if (fetchError) {
      console.error('Error fetching expired withdrawals:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    // Filter out withdrawals that already have refund transactions
    let withdrawalsToRefund = [];
    if (expiredWithdrawals && expiredWithdrawals.length > 0) {
      for (const withdrawal of expiredWithdrawals) {
        // Check if this withdrawal already has a refund transaction
        const { data: existingRefund } = await admin
          .from("transaction_logs")
          .select("id")
          .eq("reference_id", withdrawal.id)
          .eq("type", "refund")
          .limit(1);

        if (!existingRefund || existingRefund.length === 0) {
          withdrawalsToRefund.push(withdrawal);
        }
      }
    }

    let processedCount = 0;
    let totalRefunded = 0;
    const errors = [];
    const processedWithdrawals = [];

    console.log(`Found ${expiredWithdrawals?.length || 0} expired withdrawals, ${withdrawalsToRefund.length} need refunding`);

    // Process each withdrawal that needs refunding
    for (const withdrawal of withdrawalsToRefund) {
      try {
        console.log(`💸 Processing refund for withdrawal ${withdrawal.id} - ${withdrawal.amount_usdt} USDT`);

        // Get current user balance
        const { data: balanceData, error: balanceError } = await admin
          .from("user_balances")
          .select("available_balance")
          .eq("user_id", withdrawal.user_id)
          .single();

        if (balanceError) {
          console.error(`Error fetching balance for user ${withdrawal.user_id}:`, balanceError);
          errors.push(`Failed to fetch balance for withdrawal ${withdrawal.id}`);
          continue;
        }

        const currentBalance = Number(balanceData?.available_balance || 0);
        const refundAmount = Number(withdrawal.amount_usdt);
        const newBalance = currentBalance + refundAmount;

        // Update user balance
        const { error: balanceUpdateError } = await admin
          .from("user_balances")
          .update({
            available_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", withdrawal.user_id);

        if (balanceUpdateError) {
          console.error(`Error updating balance for user ${withdrawal.user_id}:`, balanceUpdateError);
          errors.push(`Failed to update balance for withdrawal ${withdrawal.id}`);
          continue;
        }

        // Mark withdrawal as refunded
        const { error: updateError } = await admin
          .from("withdrawals")
          .update({
            status: "refunded",
            processed_at: new Date().toISOString(),
            admin_notes: `Manually refunded by admin ${user.id} due to expiration`
          })
          .eq("id", withdrawal.id);

        if (updateError) {
          console.error(`Error updating withdrawal ${withdrawal.id}:`, updateError);
          errors.push(`Failed to mark withdrawal ${withdrawal.id} as refunded`);
          continue;
        }

        // Create refund transaction log
        const { error: txError } = await admin
          .from("transaction_logs")
          .insert({
            user_id: withdrawal.user_id,
            type: "refund",
            amount_usdt: refundAmount,
            description: `Manual refund for expired withdrawal to ${withdrawal.wallet_address.substring(0, 8)}...${withdrawal.wallet_address.substring(withdrawal.wallet_address.length - 6)}`,
            reference_id: withdrawal.id,
            status: "completed",
            balance_before: currentBalance,
            balance_after: newBalance,
            meta: { 
              reason: "manual_admin_refund", 
              original_withdrawal_id: withdrawal.id,
              processed_at: new Date().toISOString(),
              admin_id: user.id
            }
          });

        if (txError) {
          console.error(`Error creating refund transaction:`, txError);
          errors.push(`Failed to create transaction log for withdrawal ${withdrawal.id}`);
          // Continue anyway since the balance was updated
        }

        processedCount++;
        totalRefunded += refundAmount;
        processedWithdrawals.push({
          id: withdrawal.id,
          user_id: withdrawal.user_id,
          amount: refundAmount,
          wallet_address: withdrawal.wallet_address
        });

        console.log(`✅ Refunded ${refundAmount} USDT to user ${withdrawal.user_id} (Balance: ${currentBalance} → ${newBalance})`);

      } catch (error: any) {
        console.error(`Error processing withdrawal refund ${withdrawal.id}:`, error);
        errors.push(`Error processing withdrawal ${withdrawal.id}: ${error.message || 'Unknown error'}`);
        continue;
      }
    }

    console.log(`✅ Manual expired withdrawal refund complete. Processed: ${processedCount} withdrawals, Total: $${totalRefunded}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Expired withdrawal refunds processed successfully',
      results: {
        refunded_withdrawals: processedCount,
        total_expired_found: expiredWithdrawals?.length || 0,
        total_amount_refunded: Number(totalRefunded.toFixed(2)),
        processed_withdrawals: processedWithdrawals,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Manual expired withdrawal refund error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
