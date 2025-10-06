import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This runs every 2 minutes to monitor deposits and auto-credit user balances
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    console.log('🔍 Starting auto deposit monitoring...');
    
    // Get confirmed deposits that haven't been credited yet
    const { data: unprocessedDeposits, error: fetchError } = await admin
      .from("deposit_transactions")
      .select("*")
      .eq("status", "confirmed")
      .is("credited_at", null)
      .gte("confirmations", 3)
      .limit(10); // Process 10 at a time

    if (fetchError) {
      console.error('Error fetching unprocessed deposits:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    let creditedCount = 0;
    let totalAmount = 0;

    // Process each unprocessed deposit
    for (const deposit of unprocessedDeposits || []) {
      try {
        console.log(`💰 Processing deposit: ${deposit.amount} USDT for user ${deposit.user_id}`);

        // Get current user balance
        const { data: balanceData, error: balanceError } = await admin
          .from("balances")
          .select("available_usdt")
          .eq("user_id", deposit.user_id)
          .maybeSingle();

        if (balanceError) {
          console.error(`Error fetching balance for user ${deposit.user_id}:`, balanceError);
          continue;
        }

        const currentBalance = Number(balanceData?.available_usdt || 0);
        const depositAmount = Number(deposit.amount);
        const newBalance = currentBalance + depositAmount;

        // Update user balance
        const { error: balanceUpdateError } = await admin
          .from("balances")
          .upsert({
            user_id: deposit.user_id,
            available_usdt: newBalance
          }, { onConflict: "user_id" });

        if (balanceUpdateError) {
          console.error(`Error updating balance for user ${deposit.user_id}:`, balanceUpdateError);
          continue;
        }

        // Create deposit transaction
        const { error: txError } = await admin
          .from("transactions")
          .insert({
            user_id: deposit.user_id,
            type: "deposit",
            amount_usdt: depositAmount,
            reference_id: deposit.id,
            status: "completed",
            meta: { 
              tx_hash: deposit.tx_hash,
              from_address: deposit.from_address,
              deposit_address: deposit.deposit_address,
              network: deposit.network,
              block_number: deposit.block_number,
              confirmations: deposit.confirmations
            }
          });

        if (txError) {
          console.error(`Error creating deposit transaction:`, txError);
          continue;
        }

        // Mark deposit as credited
        const { error: updateError } = await admin
          .from("deposit_transactions")
          .update({
            credited_at: new Date().toISOString(),
            status: "credited"
          })
          .eq("id", deposit.id);

        if (updateError) {
          console.error(`Error updating deposit status:`, updateError);
          continue;
        }

        creditedCount++;
        totalAmount += depositAmount;
        console.log(`✅ Credited ${depositAmount} USDT to user ${deposit.user_id} (New balance: ${newBalance})`);

      } catch (error) {
        console.error(`Error processing deposit ${deposit.id}:`, error);
        continue;
      }
    }

    // Also check for deposits that need status updates (forwarded but not marked as credited)
    try {
      const { data: forwardedDeposits, error: forwardedError } = await admin
        .from("deposit_transactions")
        .select("*")
        .eq("status", "forwarded")
        .is("credited_at", null)
        .limit(5);

      if (!forwardedError && forwardedDeposits) {
        for (const deposit of forwardedDeposits) {
          // These were already forwarded, just need to be marked as credited
          const { error: updateError } = await admin
            .from("deposit_transactions")
            .update({
              credited_at: new Date().toISOString(),
              status: "credited"
            })
            .eq("id", deposit.id);

          if (!updateError) {
            console.log(`📝 Updated forwarded deposit ${deposit.id} status to credited`);
          }
        }
      }
    } catch (error) {
      console.log('No forwarded deposits to process (table may not exist)');
    }

    console.log(`✅ Auto deposit monitoring complete. Credited: ${creditedCount} deposits, Total: ${totalAmount} USDT`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Auto deposit monitoring completed successfully',
      deposits_credited: creditedCount,
      total_amount_credited: totalAmount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Auto deposit monitoring cron error:', error);
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
