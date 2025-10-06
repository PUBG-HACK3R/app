import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ethers } from "ethers";

// Dynamic import for TronWeb to avoid SSR issues
async function getTronWeb() {
  const { default: TronWeb } = await import('tronweb');
  return TronWeb;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REAL blockchain deposit detection
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    console.log('🔍 Starting REAL deposit detection...');
    
    let detectedCount = 0;
    let confirmedCount = 0;

    // Get active deposit addresses to monitor
    const { data: depositAddresses, error: addressError } = await admin
      .from("deposit_addresses")
      .select("*")
      .eq("is_active", true)
      .limit(20); // Monitor 20 addresses per run

    if (addressError) {
      console.error('Error fetching deposit addresses:', addressError);
      return NextResponse.json({ 
        success: false, 
        error: addressError.message 
      }, { status: 500 });
    }

    // Monitor TRON addresses
    const tronAddresses = depositAddresses?.filter(addr => addr.network === 'TRON') || [];
    if (tronAddresses.length > 0) {
      detectedCount += await monitorTronDeposits(admin, tronAddresses);
    }

    // Monitor Arbitrum addresses  
    const arbitrumAddresses = depositAddresses?.filter(addr => addr.network === 'ARBITRUM') || [];
    if (arbitrumAddresses.length > 0) {
      detectedCount += await monitorArbitrumDeposits(admin, arbitrumAddresses);
    }

    // Confirm pending deposits (check for sufficient confirmations)
    const { data: pendingDeposits } = await admin
      .from("deposit_transactions")
      .select("*")
      .eq("status", "pending")
      .gte("confirmations", 3) // Require 3+ confirmations
      .limit(10);

    for (const deposit of pendingDeposits || []) {
      try {
        // Update to confirmed status
        const { error: updateError } = await admin
          .from("deposit_transactions")
          .update({
            status: "confirmed",
            confirmed_at: new Date().toISOString()
          })
          .eq("id", deposit.id);

        if (!updateError) {
          confirmedCount++;
          console.log(`✅ Confirmed deposit ${deposit.id}: ${deposit.amount} USDT`);
        }
      } catch (error) {
        console.error(`Error confirming deposit ${deposit.id}:`, error);
      }
    }

    console.log(`✅ Deposit detection complete. Detected: ${detectedCount}, Confirmed: ${confirmedCount}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Real deposit detection completed successfully',
      deposits_detected: detectedCount,
      deposits_confirmed: confirmedCount,
      addresses_monitored: depositAddresses?.length || 0,
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

// Monitor TRON addresses for USDT deposits
async function monitorTronDeposits(admin: any, addresses: any[]): Promise<number> {
  let detectedCount = 0;
  
  try {
    const TronWeb = await getTronWeb();
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });

    const USDT_CONTRACT = process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS;
    if (!USDT_CONTRACT) {
      console.error('USDT TRC20 contract address not configured');
      return 0;
    }

    for (const addressData of addresses) {
      try {
        // Get USDT balance for this address
        const contract = await tronWeb.contract().at(USDT_CONTRACT);
        const balance = await contract.balanceOf(addressData.address).call();
        const balanceUsdt = parseFloat(balance) / 1000000; // USDT has 6 decimals

        if (balanceUsdt > 0 && balanceUsdt !== addressData.balance_usdt) {
          console.log(`💰 TRON deposit detected: ${balanceUsdt} USDT to ${addressData.address}`);

          // Get recent transactions for this address
          const transactions = await tronWeb.trx.getTransactionsFromAddress(addressData.address, 10);
          
          for (const tx of transactions) {
            // Check if this is a new USDT transfer
            if (tx.raw_data?.contract?.[0]?.type === 'TriggerSmartContract') {
              const depositAmount = balanceUsdt - (addressData.balance_usdt || 0);
              
              if (depositAmount > 0) {
                // Check if this transaction already exists to prevent duplicates
                const { data: existingTx } = await admin
                  .from("deposit_transactions")
                  .select("id")
                  .eq("tx_hash", tx.txID)
                  .eq("user_id", addressData.user_id)
                  .single();

                if (!existingTx) {
                  // Create deposit transaction record
                  const { error: insertError } = await admin
                    .from("deposit_transactions")
                    .insert({
                      user_id: addressData.user_id,
                      deposit_address: addressData.address,
                      tx_hash: tx.txID,
                      from_address: tx.raw_data.contract[0].parameter?.value?.owner_address || 'unknown',
                      amount: depositAmount,
                      network: 'TRON',
                      block_number: tx.blockNumber || 0,
                      confirmations: 1,
                      status: 'pending',
                      detected_at: new Date().toISOString()
                    });

                  if (!insertError) {
                    detectedCount++;
                    
                    // Update address balance
                    await admin
                      .from("deposit_addresses")
                      .update({ balance_usdt: balanceUsdt })
                      .eq("id", addressData.id);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error monitoring TRON address ${addressData.address}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in TRON monitoring:', error);
  }

  return detectedCount;
}

// Monitor Arbitrum addresses for USDT deposits
async function monitorArbitrumDeposits(admin: any, addresses: any[]): Promise<number> {
  let detectedCount = 0;
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    const USDT_CONTRACT = process.env.NEXT_PUBLIC_USDT_ARBITRUM_ADDRESS;
    
    if (!USDT_CONTRACT) {
      console.error('USDT Arbitrum contract address not configured');
      return 0;
    }

    // USDT contract ABI (minimal)
    const USDT_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    ];

    const usdtContract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, provider);

    for (const addressData of addresses) {
      try {
        // Get USDT balance for this address
        const balance = await usdtContract.balanceOf(addressData.address);
        const balanceUsdt = parseFloat(ethers.formatUnits(balance, 6)); // USDT has 6 decimals

        if (balanceUsdt > 0 && balanceUsdt !== addressData.balance_usdt) {
          console.log(`💰 Arbitrum deposit detected: ${balanceUsdt} USDT to ${addressData.address}`);

          // Get recent blocks to find the transfer transaction
          const latestBlock = await provider.getBlockNumber();
          const fromBlock = latestBlock - 100; // Check last 100 blocks

          // Query Transfer events to this address
          const filter = usdtContract.filters.Transfer(null, addressData.address);
          const events = await usdtContract.queryFilter(filter, fromBlock, latestBlock);

          for (const event of events) {
            // Type guard to ensure we have an EventLog with args
            if ('args' in event && event.args) {
              const depositAmount = parseFloat(ethers.formatUnits(event.args[2], 6));
              
              if (depositAmount > 0) {
                // Check if this transaction already exists to prevent duplicates
                const { data: existingTx } = await admin
                  .from("deposit_transactions")
                  .select("id")
                  .eq("tx_hash", event.transactionHash)
                  .eq("user_id", addressData.user_id)
                  .single();

                if (!existingTx) {
                  // Create deposit transaction record
                  const { error: insertError } = await admin
                    .from("deposit_transactions")
                    .insert({
                      user_id: addressData.user_id,
                      deposit_address: addressData.address,
                      tx_hash: event.transactionHash,
                      from_address: event.args[0],
                      amount: depositAmount,
                      network: 'ARBITRUM',
                      block_number: event.blockNumber,
                      confirmations: latestBlock - event.blockNumber,
                      status: 'pending',
                      detected_at: new Date().toISOString()
                    });

                  if (!insertError) {
                    detectedCount++;
                    
                    // Update address balance
                    await admin
                      .from("deposit_addresses")
                      .update({ balance_usdt: balanceUsdt })
                      .eq("id", addressData.id);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error monitoring Arbitrum address ${addressData.address}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in Arbitrum monitoring:', error);
  }

  return detectedCount;
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
