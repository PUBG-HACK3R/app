import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ethers } from "ethers";

// USDT TRC20 Contract ABI (simplified - only transfer function)
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)"
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get authenticated user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { withdrawId, userWallet, amount } = body;

    // Validate input
    if (!withdrawId || !userWallet || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: withdrawId, userWallet, amount" },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!ethers.isAddress(userWallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Get withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("hotwallet_withdrawals")
      .select("*")
      .eq("id", withdrawId)
      .eq("status", "pending")
      .single();

    if (withdrawalError || !withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal request not found or already processed" },
        { status: 404 }
      );
    }

    // Verify amount matches
    if (Number(withdrawal.amount) !== numericAmount) {
      return NextResponse.json(
        { error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // Verify wallet address matches
    if (withdrawal.to_address.toLowerCase() !== userWallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Wallet address mismatch" },
        { status: 400 }
      );
    }

    // Get environment variables
    const HOT_PRIVATE_KEY = process.env.HOT_PRIVATE_KEY;
    const RPC_URL = process.env.RPC_URL;
    const USDT_ADDRESS = process.env.USDT_ADDRESS;

    if (!HOT_PRIVATE_KEY || !RPC_URL || !USDT_ADDRESS) {
      console.error("Missing environment variables for hot wallet");
      return NextResponse.json(
        { error: "Hot wallet configuration error" },
        { status: 500 }
      );
    }

    try {
      // Initialize provider and wallet
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(HOT_PRIVATE_KEY, provider);
      
      // Initialize USDT contract
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);
      
      // Convert amount to proper decimals (USDT has 6 decimals)
      const amountInWei = ethers.parseUnits(numericAmount.toString(), 6);
      
      // Send transaction
      console.log(`Sending ${numericAmount} USDT to ${userWallet}`);
      const tx = await usdtContract.transfer(userWallet, amountInWei);
      
      console.log("Transaction sent:", tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        throw new Error("Transaction failed");
      }

      console.log("Transaction confirmed:", receipt.hash);

      // Update withdrawal record
      const { error: updateError } = await supabase
        .from("hotwallet_withdrawals")
        .update({
          status: "approved",
          tx_hash: receipt.hash,
          approved_at: new Date().toISOString()
        })
        .eq("id", withdrawId);

      if (updateError) {
        console.error("Error updating withdrawal record:", updateError);
        // Transaction was sent but DB update failed - log this critical error
        return NextResponse.json(
          { 
            error: "Transaction sent but database update failed", 
            tx_hash: receipt.hash,
            critical: true 
          },
          { status: 500 }
        );
      }

      // Add withdrawal transaction to main transactions table
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: withdrawal.user_id,
          type: "withdrawal",
          amount_usdt: numericAmount,
          reference_id: withdrawal.id,
          meta: {
            source: "hotwallet",
            tx_hash: receipt.hash,
            to_address: userWallet,
            withdrawal_type: "hot_wallet",
            approved_by: user.id
          }
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
        // Don't fail the request, just log the error
      }

      // CRITICAL FIX: Also deduct from balances table to keep systems in sync
      const { data: currentBalance } = await supabase
        .from("balances")
        .select("available_usdt")
        .eq("user_id", withdrawal.user_id)
        .single();

      const newAvailableBalance = Number(currentBalance?.available_usdt || 0) - numericAmount;

      const { error: balanceUpdateError } = await supabase
        .from("balances")
        .update({ 
          available_usdt: newAvailableBalance 
        })
        .eq("user_id", withdrawal.user_id);

      if (balanceUpdateError) {
        console.error("Error updating balance after hot wallet withdrawal:", balanceUpdateError);
        // Don't fail the request, just log the error since transaction was already sent
      }

      return NextResponse.json({
        success: true,
        tx_hash: receipt.hash,
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          to_address: withdrawal.to_address,
          status: "approved",
          tx_hash: receipt.hash
        }
      });

    } catch (blockchainError: any) {
      console.error("Blockchain transaction error:", blockchainError);
      
      // Update withdrawal status to failed
      await supabase
        .from("hotwallet_withdrawals")
        .update({
          status: "failed",
          rejection_reason: `Blockchain error: ${blockchainError.message}`
        })
        .eq("id", withdrawId);

      return NextResponse.json(
        { error: `Blockchain transaction failed: ${blockchainError.message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Hot wallet approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
