import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This runs every hour to check for withdrawal timeouts
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    // Find withdrawals that are pending and older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    console.log('🕐 Checking for withdrawal timeouts...');
    
    const { data: timedOutWithdrawals, error: fetchError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching timed out withdrawals:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    let processedCount = 0;

    // Process each timed out withdrawal
    for (const withdrawal of timedOutWithdrawals || []) {
      try {
        console.log(`⏰ Processing timeout for withdrawal ${withdrawal.id} - ${withdrawal.amount_usdt} USDT`);

        // Update withdrawal status to failed
        const { error: updateError } = await admin
          .from("withdrawals")
          .update({
            status: "failed",
            admin_notes: "Automatically failed due to 24-hour timeout",
            updated_at: new Date().toISOString()
          })
          .eq("id", withdrawal.id);

        if (updateError) {
          console.error(`Error updating withdrawal ${withdrawal.id}:`, updateError);
          continue;
        }

        // Refund the amount back to user's balance
        const { data: balanceData, error: balanceError } = await admin
          .from("user_balances")
          .select("available_balance")
          .eq("user_id", withdrawal.user_id)
          .maybeSingle();

        if (balanceError) {
          console.error(`Error fetching balance for user ${withdrawal.user_id}:`, balanceError);
          continue;
        }

        const currentBalance = Number(balanceData?.available_balance || 0);
        const newBalance = currentBalance + Number(withdrawal.amount_usdt);

        // Update user balance
        const { error: balanceUpdateError } = await admin
          .from("user_balances")
          .upsert({
            user_id: withdrawal.user_id,
            available_balance: newBalance
          }, { onConflict: "user_id" });

        if (balanceUpdateError) {
          console.error(`Error updating balance for user ${withdrawal.user_id}:`, balanceUpdateError);
          continue;
        }

        // Create refund transaction
        const { error: txError } = await admin
          .from("transaction_logs")
          .insert({
            user_id: withdrawal.user_id,
            type: "refund",
            amount_usdt: withdrawal.amount_usdt,
            reference_id: withdrawal.id,
            status: "completed",
            meta: { 
              reason: "withdrawal_timeout", 
              original_withdrawal_id: withdrawal.id,
              refunded_at: new Date().toISOString()
            }
          });

        if (txError) {
          console.error(`Error creating refund transaction:`, txError);
          continue;
        }

        processedCount++;
        console.log(`✅ Refunded ${withdrawal.amount_usdt} USDT to user ${withdrawal.user_id}`);

      } catch (error) {
        console.error(`Error processing withdrawal timeout ${withdrawal.id}:`, error);
        continue;
      }
    }

    console.log(`✅ Withdrawal timeout processing complete. Processed: ${processedCount} withdrawals`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Withdrawal timeouts processed successfully',
      timed_out_withdrawals: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Withdrawal timeout cron error:', error);
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
