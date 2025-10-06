import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This runs every 2 minutes to monitor deposits and auto-forward to main wallet
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    console.log('🔍 Starting auto-forward deposit monitoring...');
    
    // Get all active deposit addresses that might have received funds
    const { data: depositAddresses, error: addressError } = await admin
      .from("deposit_addresses")
      .select("*")
      .eq("is_active", true)
      .gt("balance_usdt", 0) // Only check addresses with balance > 0
      .limit(20); // Process 20 addresses per run

    if (addressError) {
      console.error('Error fetching deposit addresses:', addressError);
      return NextResponse.json({ 
        success: false, 
        error: addressError.message 
      }, { status: 500 });
    }

    let forwardedCount = 0;
    let totalForwarded = 0;

    // Process each address with balance
    for (const depositAddr of depositAddresses || []) {
      try {
        const balance = Number(depositAddr.balance_usdt);
        if (balance <= 0) continue;

        console.log(`💰 Found ${balance} USDT in ${depositAddr.network} address ${depositAddr.address} for user ${depositAddr.user_id}`);

        // Simulate forwarding to main wallet (in production, this would be real blockchain transactions)
        const forwardAmount = balance * 0.98; // Keep 2% for gas fees
        const gasFee = balance * 0.02;

        console.log(`🚀 Forwarding ${forwardAmount} USDT to main wallet (${gasFee} USDT gas fee)`);

        // Create deposit transaction record
        const { error: txError } = await admin
          .from("deposit_transactions")
          .insert({
            user_id: depositAddr.user_id,
            deposit_address: depositAddr.address,
            tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`, // Simulated tx hash
            from_address: depositAddr.address,
            amount: forwardAmount,
            network: depositAddr.network,
            block_number: Math.floor(Math.random() * 1000000),
            confirmations: 6,
            status: 'confirmed',
            detected_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString()
          });

        if (txError) {
          console.error(`Error creating deposit transaction:`, txError);
          continue;
        }

        // Update user balance in balances table
        const { data: balanceData, error: balanceError } = await admin
          .from("balances")
          .select("available_usdt")
          .eq("user_id", depositAddr.user_id)
          .maybeSingle();

        if (balanceError) {
          console.error(`Error fetching user balance:`, balanceError);
          continue;
        }

        const currentBalance = Number(balanceData?.available_usdt || 0);
        const newBalance = currentBalance + forwardAmount;

        // Update user balance
        const { error: balanceUpdateError } = await admin
          .from("balances")
          .upsert({
            user_id: depositAddr.user_id,
            available_usdt: newBalance
          }, { onConflict: "user_id" });

        if (balanceUpdateError) {
          console.error(`Error updating user balance:`, balanceUpdateError);
          continue;
        }

        // Create deposit transaction in transactions table for user history
        const { error: userTxError } = await admin
          .from("transactions")
          .insert({
            user_id: depositAddr.user_id,
            type: "deposit",
            amount_usdt: forwardAmount,
            status: "completed",
            description: `USDT deposit via ${depositAddr.network}`,
            meta: {
              deposit_address: depositAddr.address,
              network: depositAddr.network,
              original_amount: balance,
              gas_fee: gasFee,
              forwarded_at: new Date().toISOString()
            }
          });

        if (userTxError) {
          console.error(`Error creating user transaction:`, userTxError);
          continue;
        }

        // Update deposit address - reset balance and update totals
        const { error: updateError } = await admin
          .from("deposit_addresses")
          .update({
            balance_usdt: 0, // Reset balance after forwarding
            total_received: Number(depositAddr.total_received || 0) + balance,
            updated_at: new Date().toISOString()
          })
          .eq("id", depositAddr.id);

        if (updateError) {
          console.error(`Error updating deposit address:`, updateError);
          continue;
        }

        forwardedCount++;
        totalForwarded += forwardAmount;
        
        console.log(`✅ Forwarded ${forwardAmount} USDT to user ${depositAddr.user_id} (New balance: ${newBalance})`);

      } catch (error) {
        console.error(`Error processing deposit address ${depositAddr.id}:`, error);
        continue;
      }
    }

    console.log(`✅ Auto-forward monitoring complete. Forwarded: ${forwardedCount} deposits, Total: ${totalForwarded} USDT`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Auto-forward deposit monitoring completed successfully',
      deposits_forwarded: forwardedCount,
      total_amount_forwarded: totalForwarded,
      addresses_checked: depositAddresses?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Auto-forward deposit monitoring cron error:', error);
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
