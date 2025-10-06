import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ethers } from "ethers";

// Import TronWeb dynamically to avoid SSR issues
let TronWeb: any;
if (typeof window === 'undefined') {
  TronWeb = require('tronweb');
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REAL blockchain forwarding system - forwards deposits to main hot wallet
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    console.log('🔍 Starting REAL auto-forward deposit monitoring...');
    
    // Get all active deposit addresses that have received funds
    const { data: depositAddresses, error: addressError } = await admin
      .from("deposit_addresses")
      .select("*")
      .eq("is_active", true)
      .gt("balance_usdt", 0) // Only check addresses with balance > 0
      .limit(10); // Process 10 addresses per run (to avoid rate limits)

    if (addressError) {
      console.error('Error fetching deposit addresses:', addressError);
      return NextResponse.json({ 
        success: false, 
        error: addressError.message 
      }, { status: 500 });
    }

    let forwardedCount = 0;
    let totalForwarded = 0;

    // Process TRON addresses
    const tronAddresses = depositAddresses?.filter(addr => addr.network === 'TRON') || [];
    if (tronAddresses.length > 0) {
      const { forwarded, total } = await forwardTronDeposits(admin, tronAddresses);
      forwardedCount += forwarded;
      totalForwarded += total;
    }

    // Process Arbitrum addresses
    const arbitrumAddresses = depositAddresses?.filter(addr => addr.network === 'ARBITRUM') || [];
    if (arbitrumAddresses.length > 0) {
      const { forwarded, total } = await forwardArbitrumDeposits(admin, arbitrumAddresses);
      forwardedCount += forwarded;
      totalForwarded += total;
    }

    console.log(`✅ Auto-forward monitoring complete. Forwarded: ${forwardedCount} deposits, Total: ${totalForwarded} USDT`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Real auto-forward deposit monitoring completed successfully',
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

// Forward TRON USDT deposits to main hot wallet
async function forwardTronDeposits(admin: any, addresses: any[]): Promise<{ forwarded: number; total: number }> {
  let forwardedCount = 0;
  let totalForwarded = 0;

  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });

    const USDT_CONTRACT = process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS;
    const HOT_WALLET = process.env.NEXT_PUBLIC_HOT_WALLET_TRC20_ADDRESS;
    
    if (!USDT_CONTRACT || !HOT_WALLET) {
      console.error('TRON contract addresses not configured');
      return { forwarded: 0, total: 0 };
    }

    for (const depositAddr of addresses) {
      try {
        const balance = Number(depositAddr.balance_usdt);
        if (balance <= 1) continue; // Skip if balance is too small (less than $1)

        console.log(`💰 Forwarding ${balance} USDT from TRON address ${depositAddr.address}`);

        // Get the private key for this deposit address
        const privateKey = depositAddr.private_key;
        if (!privateKey) {
          console.error(`No private key found for address ${depositAddr.address}`);
          continue;
        }

        // Set up wallet with private key
        tronWeb.setPrivateKey(privateKey);
        
        // Get USDT contract instance
        const contract = await tronWeb.contract().at(USDT_CONTRACT);
        
        // Calculate amount to forward (keep some TRX for gas)
        const forwardAmount = balance * 0.98; // Keep 2% for fees
        const amountUsdt = Math.floor(forwardAmount * 1000000); // USDT has 6 decimals, convert to smallest unit

        // Execute USDT transfer to hot wallet
        const result = await contract.transfer(HOT_WALLET, amountUsdt).send();
        
        if (result) {
          console.log(`✅ TRON forward successful: ${result}`);

          // Update user balance
          await creditUserBalance(admin, depositAddr.user_id, forwardAmount, {
            deposit_address: depositAddr.address,
            network: 'TRON',
            tx_hash: result,
            original_amount: balance,
            gas_fee: balance - forwardAmount
          });

          // Reset deposit address balance
          await admin
            .from("deposit_addresses")
            .update({
              balance_usdt: 0,
              total_received: Number(depositAddr.total_received || 0) + balance,
              updated_at: new Date().toISOString()
            })
            .eq("id", depositAddr.id);

          forwardedCount++;
          totalForwarded += forwardAmount;
        }

      } catch (error) {
        console.error(`Error forwarding TRON deposit from ${depositAddr.address}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in TRON forwarding:', error);
  }

  return { forwarded: forwardedCount, total: totalForwarded };
}

// Forward Arbitrum USDT deposits to main hot wallet
async function forwardArbitrumDeposits(admin: any, addresses: any[]): Promise<{ forwarded: number; total: number }> {
  let forwardedCount = 0;
  let totalForwarded = 0;

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    const USDT_CONTRACT = process.env.NEXT_PUBLIC_USDT_ARBITRUM_ADDRESS;
    const HOT_WALLET = process.env.NEXT_PUBLIC_HOT_WALLET_ARBITRUM_ADDRESS;
    
    if (!USDT_CONTRACT || !HOT_WALLET) {
      console.error('Arbitrum contract addresses not configured');
      return { forwarded: 0, total: 0 };
    }

    // USDT contract ABI
    const USDT_ABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address) view returns (uint256)"
    ];

    for (const depositAddr of addresses) {
      try {
        const balance = Number(depositAddr.balance_usdt);
        if (balance <= 1) continue; // Skip if balance is too small

        console.log(`💰 Forwarding ${balance} USDT from Arbitrum address ${depositAddr.address}`);

        // Get the private key for this deposit address
        const privateKey = depositAddr.private_key;
        if (!privateKey) {
          console.error(`No private key found for address ${depositAddr.address}`);
          continue;
        }

        // Set up wallet with private key
        const wallet = new ethers.Wallet(privateKey, provider);
        const usdtContract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, wallet);

        // Calculate amount to forward (keep some ETH for gas)
        const forwardAmount = balance * 0.98; // Keep 2% for fees
        const amountWei = ethers.parseUnits(forwardAmount.toString(), 6); // USDT has 6 decimals

        // Execute USDT transfer to hot wallet
        const tx = await usdtContract.transfer(HOT_WALLET, amountWei);
        const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
          console.log(`✅ Arbitrum forward successful: ${receipt.hash}`);

          // Update user balance
          await creditUserBalance(admin, depositAddr.user_id, forwardAmount, {
            deposit_address: depositAddr.address,
            network: 'ARBITRUM',
            tx_hash: receipt.hash,
            original_amount: balance,
            gas_fee: balance - forwardAmount
          });

          // Reset deposit address balance
          await admin
            .from("deposit_addresses")
            .update({
              balance_usdt: 0,
              total_received: Number(depositAddr.total_received || 0) + balance,
              updated_at: new Date().toISOString()
            })
            .eq("id", depositAddr.id);

          forwardedCount++;
          totalForwarded += forwardAmount;
        }

      } catch (error) {
        console.error(`Error forwarding Arbitrum deposit from ${depositAddr.address}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in Arbitrum forwarding:', error);
  }

  return { forwarded: forwardedCount, total: totalForwarded };
}

// Credit user balance after successful forwarding
async function creditUserBalance(admin: any, userId: string, amount: number, meta: any) {
  try {
    // Get current user balance
    const { data: balanceData } = await admin
      .from("balances")
      .select("available_usdt")
      .eq("user_id", userId)
      .maybeSingle();

    const currentBalance = Number(balanceData?.available_usdt || 0);
    const newBalance = currentBalance + amount;

    // Update user balance
    await admin
      .from("balances")
      .upsert({
        user_id: userId,
        available_usdt: newBalance
      }, { onConflict: "user_id" });

    // Create transaction record
    await admin
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount_usdt: amount,
        status: "completed",
        description: `USDT deposit via ${meta.network}`,
        meta: {
          ...meta,
          forwarded_at: new Date().toISOString()
        }
      });

    console.log(`✅ Credited ${amount} USDT to user ${userId} (New balance: ${newBalance})`);
  } catch (error) {
    console.error(`Error crediting user balance:`, error);
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
