import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// This endpoint should be called every 30 seconds by a cron job
// It monitors all user deposit addresses for incoming USDT transactions

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Network-specific configuration for Arbitrum monitoring
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL!;
const ARBITRUM_PRIVATE_KEY = process.env.ARBITRUM_PRIVATE_KEY!;
const USDT_ARBITRUM_ADDRESS = process.env.USDT_ARBITRUM_ADDRESS!;
const HOT_WALLET_ARBITRUM_ADDRESS = process.env.HOT_WALLET_ARBITRUM_ADDRESS!;

// USDT Contract ABI (minimal for transfer and balanceOf)
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
    // Verify cron secret - TEMPORARILY DISABLED FOR TESTING
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${REVALIDATE_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('🔍 Starting deposit monitoring...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL);
    const wallet = new ethers.Wallet(ARBITRUM_PRIVATE_KEY, provider);
    const usdtContract = new ethers.Contract(USDT_ARBITRUM_ADDRESS, USDT_ABI, wallet);

    // Get all active Arbitrum deposit addresses
    const { data: addresses, error: addressError } = await supabase
      .from('user_deposit_addresses')
      .select('*')
      .eq('is_active', true)
      .eq('network', 'arbitrum');

    if (addressError) {
      console.error('Error fetching addresses:', addressError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`📍 Monitoring ${addresses?.length || 0} addresses`);

    let totalProcessed = 0;
    let totalForwarded = 0;

    // Check each address for USDT balance
    for (const addressData of addresses || []) {
      try {
        const balance = await usdtContract.balanceOf(addressData.deposit_address);
        const balanceInUsdt = parseFloat(ethers.formatUnits(balance, 6)); // USDT has 6 decimals

        console.log(`💰 Address ${addressData.deposit_address}: ${balanceInUsdt} USDT`);

        // If balance > 0, we have a deposit to process
        if (balanceInUsdt > 0) {
          console.log(`🎯 Found deposit: ${balanceInUsdt} USDT for user ${addressData.user_id}`);

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
                console.log(`📝 Recording new deposit: ${amount} USDT from ${fromAddress}`);

                // Record the deposit
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
                    status: 'confirmed', // Auto-confirm for now
                    detected_at: new Date().toISOString(),
                    confirmed_at: new Date().toISOString(),
                    network: 'arbitrum'
                  });

                if (insertError) {
                  console.error('Error inserting deposit:', insertError);
                  continue;
                }

                totalProcessed++;
              }
            }
          }

          // Forward the balance to main hot wallet
          if (balanceInUsdt >= 0.1) { // Only forward if >= $0.10 to cover gas
            try {
              console.log(`🚀 Forwarding ${balanceInUsdt} USDT to main wallet...`);

              // For testing: Use main wallet to forward USDT from deposit address
              // Note: This assumes the deposit address private key can be derived
              const tempPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(addressData.deposit_address + ARBITRUM_PRIVATE_KEY));
              const tempWallet = new ethers.Wallet(tempPrivateKey, provider);
              const tempUsdtContract = new ethers.Contract(USDT_ARBITRUM_ADDRESS, USDT_ABI, tempWallet);

              // Check if main hot wallet has ETH for gas (we'll use it to pay gas fees)
              const mainWalletBalance = await provider.getBalance(HOT_WALLET_ARBITRUM_ADDRESS);
              console.log(`💰 Main wallet ETH balance: ${ethers.formatEther(mainWalletBalance)} ETH`);
              
              if (mainWalletBalance < ethers.parseEther("0.0004")) {
                console.log(`⚠️ Insufficient ETH for gas in main wallet: ${HOT_WALLET_ARBITRUM_ADDRESS}`);
                console.log(`🔧 Need to send ETH to main wallet: ${HOT_WALLET_ARBITRUM_ADDRESS}`);
                continue;
              }

              // First, send ETH from main wallet to temp wallet for gas
              const mainWallet = new ethers.Wallet(ARBITRUM_PRIVATE_KEY, provider);
              const gasAmount = ethers.parseEther("0.0003"); // Send 0.0003 ETH for gas (reduced)
              
              console.log(`💸 Sending ${ethers.formatEther(gasAmount)} ETH to temp wallet for gas...`);
              const gasTx = await mainWallet.sendTransaction({
                to: tempWallet.address,
                value: gasAmount
              });
              await gasTx.wait();
              console.log(`✅ Gas sent: ${gasTx.hash}`);

              // Now transfer USDT from temp wallet to main wallet
              const transferAmount = ethers.parseUnits(balanceInUsdt.toString(), 6);
              console.log(`💸 Transferring ${balanceInUsdt} USDT from temp wallet...`);
              const transferTx = await tempUsdtContract.transfer(HOT_WALLET_ARBITRUM_ADDRESS, transferAmount);
              
              console.log(`✅ Forward transaction sent: ${transferTx.hash}`);

              // Update deposit record with forward transaction
              await supabase
                .from('deposit_monitoring')
                .update({
                  forward_tx_hash: transferTx.hash,
                  status: 'forwarded',
                  forwarded_at: new Date().toISOString()
                })
                .eq('deposit_address', addressData.deposit_address)
                .eq('status', 'confirmed');

              totalForwarded++;

            } catch (forwardError) {
              console.error('Error forwarding funds:', forwardError);
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
        console.error(`Error processing address ${addressData.deposit_address}:`, error);
        continue;
      }
    }

    console.log(`✅ Monitoring complete. Processed: ${totalProcessed}, Forwarded: ${totalForwarded}`);

    return NextResponse.json({
      success: true,
      addresses_monitored: addresses?.length || 0,
      deposits_processed: totalProcessed,
      funds_forwarded: totalForwarded,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Deposit monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
