import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
const TronWeb = require('tronweb');

// TRON TRC20 USDT monitoring service
// This endpoint should be called every 30 seconds by a cron job

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RPC_URL = process.env.RPC_URL!;
const HOT_PRIVATE_KEY = process.env.HOT_PRIVATE_KEY!;
const USDT_ADDRESS = process.env.USDT_ADDRESS!; // TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
const MAIN_HOT_WALLET = process.env.HOT_WALLET_ADDRESS!;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${REVALIDATE_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Starting TRON deposit monitoring...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Initialize TronWeb
    const tronWeb = new TronWeb({
      fullHost: RPC_URL,
      privateKey: HOT_PRIVATE_KEY
    });

    // Get all active deposit addresses
    const { data: addresses, error: addressError } = await supabase
      .from('user_deposit_addresses')
      .select('*')
      .eq('is_active', true)
      .eq('network', 'tron');

    if (addressError) {
      console.error('Error fetching addresses:', addressError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`📍 Monitoring ${addresses?.length || 0} TRON addresses`);

    let totalProcessed = 0;
    let totalForwarded = 0;

    // Check each address for USDT TRC20 balance
    for (const addressData of addresses || []) {
      try {
        // Get USDT contract instance
        const contract = await tronWeb.contract().at(USDT_ADDRESS);
        
        // Get USDT balance (6 decimals for USDT TRC20)
        const balance = await contract.balanceOf(addressData.deposit_address).call();
        const balanceInUsdt = parseFloat(tronWeb.fromSun(balance)) / 1000000; // Convert from sun and adjust for 6 decimals

        console.log(`💰 Address ${addressData.deposit_address}: ${balanceInUsdt} USDT`);

        // If balance > 0, we have a deposit to process
        if (balanceInUsdt > 0) {
          console.log(`🎯 Found deposit: ${balanceInUsdt} USDT for user ${addressData.user_id}`);

          // Get recent transactions for this address
          const account = await tronWeb.trx.getAccount(addressData.deposit_address);
          
          if (account && account.address) {
            // Get TRC20 transfers to this address
            const transfers = await tronWeb.trx.getTokenTransfersToAddress(
              tronWeb.address.toHex(addressData.deposit_address),
              { limit: 20 }
            );

            for (const transfer of transfers || []) {
              if (transfer.token_info && transfer.token_info.address === USDT_ADDRESS) {
                const txHash = transfer.transaction_id;
                const amount = parseFloat(transfer.value) / 1000000; // Convert to USDT (6 decimals)
                const fromAddress = tronWeb.address.fromHex(transfer.from);

                // Check if we already processed this transaction
                const { data: existingDeposit } = await supabase
                  .from('deposit_monitoring')
                  .select('id')
                  .eq('tx_hash', txHash)
                  .single();

                if (!existingDeposit && amount > 0) {
                  console.log(`📝 Recording new TRON deposit: ${amount} USDT from ${fromAddress}`);

                  // Get transaction details
                  const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
                  
                  // Record the deposit
                  const { error: insertError } = await supabase
                    .from('deposit_monitoring')
                    .insert({
                      user_id: addressData.user_id,
                      deposit_address: addressData.deposit_address,
                      tx_hash: txHash,
                      from_address: fromAddress,
                      amount: amount,
                      block_number: txInfo.blockNumber || 0,
                      confirmations: 1, // TRON confirmations are fast
                      status: 'confirmed',
                      detected_at: new Date().toISOString(),
                      confirmed_at: new Date().toISOString(),
                      network: 'tron'
                    });

                  if (insertError) {
                    console.error('Error inserting deposit:', insertError);
                    continue;
                  }

                  totalProcessed++;
                }
              }
            }
          }

          // Forward the balance to main hot wallet
          if (balanceInUsdt >= 1) { // Only forward if >= $1
            try {
              console.log(`🚀 Forwarding ${balanceInUsdt} USDT to main wallet...`);

              // Create temporary wallet for this address
              const tempPrivateKey = tronWeb.utils.crypto.keccak256(
                Buffer.from(addressData.deposit_address + HOT_PRIVATE_KEY, 'utf8')
              ).toString('hex');
              
              const tempTronWeb = new TronWeb({
                fullHost: RPC_URL,
                privateKey: tempPrivateKey
              });

              const tempContract = await tempTronWeb.contract().at(USDT_ADDRESS);
              
              // Transfer USDT to main hot wallet
              const transferAmount = Math.floor(balanceInUsdt * 1000000); // Convert to smallest unit
              const transferTx = await tempContract.transfer(
                MAIN_HOT_WALLET,
                transferAmount
              ).send();
              
              console.log(`✅ Forward transaction sent: ${transferTx}`);

              // Update deposit record with forward transaction
              await supabase
                .from('deposit_monitoring')
                .update({
                  forward_tx_hash: transferTx,
                  status: 'forwarded',
                  forwarded_at: new Date().toISOString()
                })
                .eq('deposit_address', addressData.deposit_address)
                .eq('status', 'confirmed');

              totalForwarded++;

            } catch (forwardError) {
              console.error('Error forwarding TRON funds:', forwardError);
              // Mark as failed but don't stop processing other addresses
              await supabase
                .from('deposit_monitoring')
                .update({
                  status: 'failed'
                })
                .eq('deposit_address', addressData.deposit_address)
                .eq('status', 'confirmed');
            }
          }
        }

      } catch (error) {
        console.error(`Error processing TRON address ${addressData.deposit_address}:`, error);
        continue;
      }
    }

    console.log(`✅ TRON monitoring complete. Processed: ${totalProcessed}, Forwarded: ${totalForwarded}`);

    return NextResponse.json({
      success: true,
      network: 'tron',
      addresses_monitored: addresses?.length || 0,
      deposits_processed: totalProcessed,
      funds_forwarded: totalForwarded,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('TRON deposit monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
