import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// ARB-specific monitoring endpoint
// This monitors Arbitrum USDT deposits and forwards to ARB hot wallet

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ARB_RPC_URL = process.env.ARB_RPC_URL!;
const ARB_PRIVATE_KEY = process.env.ARB_PRIVATE_KEY!;
const ARB_USDT_ADDRESS = process.env.ARB_USDT_ADDRESS!;
const ARB_HOT_WALLET = process.env.ARB_HOT_WALLET_ADDRESS!;

// USDT Contract ABI (same for all networks)
const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// Support both GET and POST for flexibility with different cron services
export async function GET(request: NextRequest) {
  return handleDepositMonitoring(request);
}

export async function POST(request: NextRequest) {
  return handleDepositMonitoring(request);
}

async function handleDepositMonitoring(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${REVALIDATE_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Starting ARB deposit monitoring...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const provider = new ethers.JsonRpcProvider(ARB_RPC_URL);
    const wallet = new ethers.Wallet(ARB_PRIVATE_KEY, provider);
    const usdtContract = new ethers.Contract(ARB_USDT_ADDRESS, USDT_ABI, wallet);

    // Get all active ARB deposit addresses
    const { data: addresses, error: addressError } = await supabase
      .from('user_deposit_addresses')
      .select('*')
      .eq('is_active', true)
      .eq('network', 'arbitrum'); // Only ARB addresses

    if (addressError) {
      console.error('Error fetching ARB addresses:', addressError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`📍 Monitoring ${addresses?.length || 0} ARB addresses`);

    let totalProcessed = 0;
    let totalForwarded = 0;

    // Check each ARB address for USDT balance
    for (const addressData of addresses || []) {
      try {
        const balance = await usdtContract.balanceOf(addressData.deposit_address);
        const balanceInUsdt = parseFloat(ethers.formatUnits(balance, 6)); // USDT has 6 decimals

        console.log(`💰 ARB Address ${addressData.deposit_address}: ${balanceInUsdt} USDT`);

        // If balance > 0, we have a deposit to process
        if (balanceInUsdt > 0) {
          console.log(`🎯 Found ARB deposit: ${balanceInUsdt} USDT for user ${addressData.user_id}`);

          // Get recent transactions to find the deposit transaction
          const latestBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, latestBlock - 1000); // Check last 1000 blocks

          // Get transfer events to this address
          const filter = usdtContract.filters.Transfer(null, addressData.deposit_address);
          const events = await usdtContract.queryFilter(filter, fromBlock, latestBlock);

          for (const event of events) {
            // Type guard to ensure we have an EventLog with args
            if (!('args' in event) || !event.args) continue;
            
            const txHash = event.transactionHash;
            const amount = parseFloat(ethers.formatUnits(event.args[2], 6));
            const fromAddress = event.args[0];

            // Check if we already processed this transaction
            const { data: existingDeposit } = await supabase
              .from('deposit_monitoring')
              .select('id')
              .eq('tx_hash', txHash)
              .single();

            if (!existingDeposit) {
              // Get transaction details
              const tx = await provider.getTransaction(txHash);
              const receipt = await provider.getTransactionReceipt(txHash);

              if (tx && receipt) {
                console.log(`📝 Recording new ARB deposit: ${amount} USDT from ${fromAddress}`);

                // Record the deposit with CORRECT network
                const { error: insertError } = await supabase
                  .from('deposit_monitoring')
                  .insert({
                    user_id: addressData.user_id,
                    deposit_address: addressData.deposit_address,
                    tx_hash: txHash,
                    from_address: fromAddress,
                    amount: amount,
                    block_number: receipt.blockNumber,
                    confirmations: latestBlock - receipt.blockNumber,
                    status: 'confirmed',
                    detected_at: new Date().toISOString(),
                    confirmed_at: new Date().toISOString(),
                    network: 'arbitrum' // CORRECT network!
                  });

                if (insertError) {
                  console.error('Error inserting ARB deposit:', insertError);
                  continue;
                }

                totalProcessed++;
              }
            }
          }

          // Forward the balance to ARB hot wallet
          if (balanceInUsdt >= 0.1) { // Lower threshold for ARB
            try {
              console.log(`🚀 Forwarding ${balanceInUsdt} USDT to ARB hot wallet...`);

              // Create a temporary wallet for this address
              const tempPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(addressData.deposit_address + ARB_PRIVATE_KEY));
              const tempWallet = new ethers.Wallet(tempPrivateKey, provider);
              const tempUsdtContract = new ethers.Contract(ARB_USDT_ADDRESS, USDT_ABI, tempWallet);

              // Transfer USDT to ARB hot wallet
              const transferAmount = ethers.parseUnits(balanceInUsdt.toString(), 6);
              const transferTx = await tempUsdtContract.transfer(ARB_HOT_WALLET, transferAmount);
              
              console.log(`✅ ARB Forward transaction sent: ${transferTx.hash}`);

              // Update deposit record with forward transaction
              await supabase
                .from('deposit_monitoring')
                .update({
                  forward_tx_hash: transferTx.hash,
                  status: 'forwarded',
                  forwarded_at: new Date().toISOString()
                })
                .eq('deposit_address', addressData.deposit_address)
                .eq('status', 'confirmed')
                .eq('network', 'arbitrum');

              totalForwarded++;

            } catch (forwardError) {
              console.error('Error forwarding ARB funds:', forwardError);
              await supabase
                .from('deposit_monitoring')
                .update({
                  status: 'failed'
                })
                .eq('deposit_address', addressData.deposit_address)
                .eq('status', 'confirmed')
                .eq('network', 'arbitrum');
            }
          }
        }

      } catch (error) {
        console.error(`Error processing ARB address ${addressData.deposit_address}:`, error);
        continue;
      }
    }

    console.log(`✅ ARB Monitoring complete. Processed: ${totalProcessed}, Forwarded: ${totalForwarded}`);

    return NextResponse.json({
      success: true,
      network: 'arbitrum',
      addresses_monitored: addresses?.length || 0,
      deposits_processed: totalProcessed,
      funds_forwarded: totalForwarded,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ARB deposit monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
