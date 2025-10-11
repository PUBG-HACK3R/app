import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This runs to refund expired withdrawals that haven't been refunded yet
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service or admin
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    console.log('💰 Checking for expired withdrawals to refund...');
    
    // Find withdrawals that are expired and haven't been refunded yet
    const { data: expiredWithdrawals, error: fetchError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("status", "expired")
      .is("refunded_at", null); // Only get withdrawals that haven't been refunded yet

    if (fetchError) {
      console.error('Error fetching expired withdrawals:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    let processedCount = 0;
    const errors = [];

    // Process each expired withdrawal
    for (const withdrawal of expiredWithdrawals || []) {
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
            refunded_at: new Date().toISOString(),
            admin_notes: "Automatically refunded due to expiration"
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
            description: `Refund for expired withdrawal to ${withdrawal.wallet_address.substring(0, 8)}...${withdrawal.wallet_address.substring(withdrawal.wallet_address.length - 6)}`,
            reference_id: withdrawal.id,
            status: "completed",
            balance_before: currentBalance,
            balance_after: newBalance,
            meta: { 
              reason: "withdrawal_expired", 
              original_withdrawal_id: withdrawal.id,
              refunded_at: new Date().toISOString()
            }
          });

        if (txError) {
          console.error(`Error creating refund transaction:`, txError);
          errors.push(`Failed to create transaction log for withdrawal ${withdrawal.id}`);
          // Continue anyway since the balance was updated
        }

        processedCount++;
        console.log(`✅ Refunded ${refundAmount} USDT to user ${withdrawal.user_id} (Balance: ${currentBalance} → ${newBalance})`);

      } catch (error) {
        console.error(`Error processing withdrawal refund ${withdrawal.id}:`, error);
        errors.push(`Error processing withdrawal ${withdrawal.id}: ${error.message}`);
        continue;
      }
    }

    console.log(`✅ Expired withdrawal refund processing complete. Processed: ${processedCount} withdrawals`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Expired withdrawal refunds processed successfully',
      refunded_withdrawals: processedCount,
      total_expired: expiredWithdrawals?.length || 0,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Expired withdrawal refund cron error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
