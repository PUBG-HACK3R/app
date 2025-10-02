import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ethers } from "ethers";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { txHash, amount, wallet } = body;

    // Validate input
    if (!txHash || !amount || !wallet) {
      return NextResponse.json(
        { error: "Missing required fields: txHash, amount, wallet" },
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

    // Validate transaction hash format
    if (!ethers.isHexString(txHash, 32)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!ethers.isAddress(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Optional: Verify the transaction on blockchain (for production)
    // For now, we'll trust the frontend verification
    
    // Check if transaction hash already exists
    const { data: existingDeposit } = await supabase
      .from("hotwallet_deposits")
      .select("id")
      .eq("tx_hash", txHash)
      .single();

    if (existingDeposit) {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 409 }
      );
    }

    // Insert hot wallet deposit record
    const { data: deposit, error: depositError } = await supabase
      .from("hotwallet_deposits")
      .insert({
        user_id: user.id,
        amount: numericAmount,
        tx_hash: txHash,
        wallet_address: wallet,
        status: "confirmed", // Assuming frontend verified the transaction
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (depositError) {
      console.error("Error creating hot wallet deposit:", depositError);
      return NextResponse.json(
        { error: "Failed to record deposit" },
        { status: 500 }
      );
    }

    // Add transaction record to main transactions table
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "deposit",
        amount_usdt: numericAmount,
        reference_id: deposit.id,
        meta: {
          source: "hotwallet",
          tx_hash: txHash,
          wallet_address: wallet,
          deposit_type: "hot_wallet"
        }
      });

    if (transactionError) {
      console.error("Error creating transaction record:", transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        amount: deposit.amount,
        tx_hash: deposit.tx_hash,
        status: deposit.status,
        created_at: deposit.created_at
      }
    });

  } catch (error) {
    console.error("Hot wallet deposit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
