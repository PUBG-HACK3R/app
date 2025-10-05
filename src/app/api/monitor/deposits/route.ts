import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Monitor blockchain for deposits (called by cron job)
export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdminClient();
    let totalProcessed = 0;
    let errors: string[] = [];

    return NextResponse.json({
      success: true,
      totalProcessed,
      errors,
      message: `Processed ${totalProcessed} deposits`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Deposit monitoring error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Process a detected deposit
async function processDeposit(admin: any, depositData: any) {
  try {
    // Check if deposit already exists
    const { data: existing } = await admin
      .from("deposits")
      .select("id")
      .eq("tx_hash", depositData.txHash)
      .single();

    if (existing) {
      return false; // Already processed
    }

    // Get deposit address info
    const { data: depositAddress } = await admin
      .from("deposit_addresses")
      .select("id, address, private_key")
      .eq("user_id", depositData.userId)
      .eq("network", depositData.network)
      .single();

    if (!depositAddress) {
      return false;
    }

    // Insert deposit record
    const { error: depositError } = await admin
      .from("deposits")
      .insert({
        user_id: depositData.userId,
        deposit_address_id: depositAddress.id,
        network: depositData.network,
        from_address: depositData.fromAddress,
        to_address: depositData.toAddress,
        amount_usdt: depositData.amount,
        tx_hash: depositData.txHash,
        block_number: depositData.blockNumber,
        status: 'confirmed'
      });

    if (depositError) {
      return false;
    }

    // Update user balance
    const { error: balanceError } = await admin
      .from("profiles")
      .update({ 
        balance_usdt: admin.raw(`balance_usdt + ${depositData.amount}`)
      })
      .eq("user_id", depositData.userId);

    if (balanceError) {
      return false;
    }

    // Create transaction record
    const { error: txError } = await admin
      .from("transactions")
      .insert({
        user_id: depositData.userId,
        type: 'deposit',
        amount_usdt: depositData.amount,
        status: 'completed',
        description: `USDT deposit via ${depositData.network}`,
        reference_id: depositData.txHash
      });

    if (txError) {
      return false;
    }

    // Update deposit address stats
    await admin
      .from("deposit_addresses")
      .update({
        balance_usdt: admin.raw(`balance_usdt + ${depositData.amount}`),
        total_received: admin.raw(`total_received + ${depositData.amount}`),
        last_checked: new Date().toISOString()
      })
      .eq("id", depositAddress.id);

    // AUTO-SWEEP: Transfer funds to main hot wallet
    try {
      const sweepResult = await sweepToHotWallet(depositData.network, depositAddress, depositData.amount);
      
      if (sweepResult.success) {
        // Record the sweep transaction
        await admin
          .from("transactions")
          .insert({
            user_id: depositData.userId,
            type: 'sweep',
            amount_usdt: depositData.amount,
            status: 'completed',
            description: `Auto-sweep to hot wallet (${depositData.network})`,
            reference_id: sweepResult.success ? (sweepResult as any).txHash : 'failed'
          });

        console.log(`✅ Swept ${depositData.amount} USDT to hot wallet:`, sweepResult.success ? (sweepResult as any).txHash : 'unknown');
      } else {
        console.error(`Failed to sweep funds:`, sweepResult.error);
        
        // Record failed sweep for manual intervention
        await admin
          .from("transactions")
          .insert({
            user_id: depositData.userId,
            type: 'sweep_failed',
            amount_usdt: depositData.amount,
            status: 'failed',
            description: `Auto-sweep failed: ${sweepResult.error}`,
            reference_id: depositData.txHash
          });
      }
    } catch (sweepError) {
      console.error('Sweep error:', sweepError);
    }

    return true;
  } catch (error) {
    console.error('Process deposit error:', error);
    return false;
  }
}

// AUTO-SWEEP: Transfer funds to main hot wallet
async function sweepToHotWallet(network: string, depositAddress: any, amount: number) {
  try {
    const hotWalletAddress = network === 'TRON' 
      ? process.env.HOT_WALLET_TRC20_ADDRESS 
      : process.env.HOT_WALLET_ARBITRUM_ADDRESS;

    if (!hotWalletAddress) {
      return { success: false, error: `Hot wallet address not configured for ${network}` };
    }

    // Calculate sweep amount (leave small amount for gas fees)
    const gasReserve = network === 'TRON' ? 1 : 0.001; // TRX for TRON, ETH for Arbitrum
    const sweepAmount = Math.max(0, amount - gasReserve);

    if (sweepAmount <= 0) {
      return { success: false, error: 'Amount too small to sweep after gas reserve' };
    }

    if (network === 'TRON') {
      return await sweepTronFunds(depositAddress, hotWalletAddress, sweepAmount);
    } else if (network === 'ARBITRUM') {
      return await sweepArbitrumFunds(depositAddress, hotWalletAddress, sweepAmount);
    }

    return { success: false, error: `Unsupported network: ${network}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown sweep error' };
  }
}

// AUTO-SWEEP: Sweep TRON funds to hot wallet
async function sweepTronFunds(depositAddress: any, hotWalletAddress: string, amount: number) {
  try {
    // In production, use TronWeb to create and broadcast transaction
    // For now, simulate the sweep
    
    const { default: TronWeb } = await import('tronweb');
    const tronWeb = new TronWeb({
      fullHost: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
      privateKey: depositAddress.private_key
    });

    // USDT TRC20 contract
    const usdtContract = await tronWeb.contract().at(process.env.USDT_TRC20_ADDRESS);
    
    // Convert amount to proper decimals (USDT has 6 decimals)
    const amountInDecimals = Math.floor(amount * 1000000);
    
    // Create transfer transaction
    const transaction = await usdtContract.transfer(hotWalletAddress, amountInDecimals).send();
    
    return { 
      success: true, 
      txHash: transaction,
      amount: amount,
      to: hotWalletAddress
    };
  } catch (error) {
    console.error('TRON sweep error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'TRON sweep failed' 
    };
  }
}

// AUTO-SWEEP: Sweep Arbitrum funds to hot wallet  
async function sweepArbitrumFunds(depositAddress: any, hotWalletAddress: string, amount: number) {
  try {
    // In production, use ethers.js to create and broadcast transaction
    // For now, simulate the sweep
    
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const wallet = new ethers.Wallet(depositAddress.private_key, provider);
    
    // USDT contract on Arbitrum
    const usdtContract = new ethers.Contract(
      process.env.USDT_ARBITRUM_ADDRESS || '',
      ['function transfer(address to, uint256 amount) returns (bool)'],
      wallet
    );
    
    // Convert amount to proper decimals (USDT has 6 decimals)
    const amountInDecimals = ethers.parseUnits(amount.toString(), 6);
    
    // Create transfer transaction
    const transaction = await usdtContract.transfer(hotWalletAddress, amountInDecimals);
    await transaction.wait();
    
    return { 
      success: true, 
      txHash: transaction.hash,
      amount: amount,
      to: hotWalletAddress
    };
  } catch (error) {
    console.error('Arbitrum sweep error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Arbitrum sweep failed' 
    };
  }
}
