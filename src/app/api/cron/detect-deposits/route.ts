import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This runs every 30 seconds to detect new deposits
// It's a simplified version that works without blockchain integration
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    console.log('🔍 Starting deposit detection...');
    
    // For demo purposes, we'll simulate deposit detection
    // In production, this would integrate with blockchain APIs
    
    // Check for any manual deposits that need processing
    let pendingDeposits = null;
    let fetchError = null;
    
    try {
      const { data, error } = await admin
        .from("deposit_transactions")
        .select("*")
        .eq("status", "pending")
        .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 minutes old
        .limit(10);
      
      pendingDeposits = data;
      fetchError = error;
    } catch (error: any) {
      console.log('deposit_transactions table not found, will simulate detection...');
      pendingDeposits = [];
      fetchError = null;
    }

    if (fetchError) {
      console.error('Error fetching pending deposits:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    let confirmedCount = 0;

    // Auto-confirm deposits that are 5+ minutes old (simulation)
    for (const deposit of pendingDeposits || []) {
      try {
        console.log(`✅ Auto-confirming deposit: ${deposit.amount} USDT for user ${deposit.user_id}`);

        // Update deposit status to confirmed
        const { error: updateError } = await admin
          .from("deposit_transactions")
          .update({
            status: "confirmed",
            confirmations: 6, // Simulate 6 confirmations
            confirmed_at: new Date().toISOString()
          })
          .eq("id", deposit.id);

        if (updateError) {
          console.error(`Error confirming deposit ${deposit.id}:`, updateError);
          continue;
        }

        confirmedCount++;
        console.log(`✅ Confirmed deposit ${deposit.id}`);

      } catch (error) {
        console.error(`Error processing deposit ${deposit.id}:`, error);
        continue;
      }
    }

    // Check for active deposit addresses that might have received funds
    let detectedCount = 0;
    let activeAddresses = null;
    
    try {
      const { data, error: addressError } = await admin
        .from("user_deposit_addresses")
        .select("*")
        .eq("is_active", true)
        .limit(10); // Process 10 addresses per run

      activeAddresses = data;

      if (!addressError && activeAddresses && activeAddresses.length > 0) {
        // In a real implementation, you would check blockchain for each address
        // For now, we'll just log that we're monitoring them
        console.log(`📍 Monitoring ${activeAddresses.length} active deposit addresses`);
        
        // Simulate occasional deposit detection (for demo)
        if (Math.random() < 0.1) { // 10% chance
          const randomAddress = activeAddresses[Math.floor(Math.random() * activeAddresses.length)];
          const randomAmount = (Math.random() * 100 + 10).toFixed(2); // $10-$110
          
          console.log(`🎯 Simulated deposit detected: ${randomAmount} USDT to ${randomAddress.deposit_address}`);
          
          // Create simulated deposit record
          const { error: insertError } = await admin
            .from("deposit_transactions")
            .insert({
              user_id: randomAddress.user_id,
              deposit_address: randomAddress.deposit_address,
              tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`, // Fake tx hash
              from_address: `0x${Math.random().toString(16).substr(2, 40)}`, // Fake from address
              amount: parseFloat(randomAmount),
              block_number: Math.floor(Math.random() * 1000000),
              confirmations: 1,
              status: 'pending',
              detected_at: new Date().toISOString(),
              network: randomAddress.network || 'arbitrum'
            });

          if (!insertError) {
            detectedCount++;
            console.log(`📝 Created deposit record for ${randomAmount} USDT`);
          }
        }
      } else {
        console.log('📍 No active deposit addresses found or table does not exist');
      }
    } catch (error) {
      console.log('📍 user_deposit_addresses table not found, skipping address monitoring');
    }

    console.log(`✅ Deposit detection complete. Confirmed: ${confirmedCount}, Detected: ${detectedCount}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Deposit detection completed successfully',
      deposits_confirmed: confirmedCount,
      deposits_detected: detectedCount,
      addresses_monitored: activeAddresses?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Deposit detection cron error:', error);
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
