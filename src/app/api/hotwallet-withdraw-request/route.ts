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
    const { amount, toAddress } = body;

    // Validate input
    if (!amount || !toAddress) {
      return NextResponse.json(
        { error: "Missing required fields: amount, toAddress" },
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

    // Minimum withdrawal amount
    if (numericAmount < 10) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $10 USDT" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Check user balance from balances table (consistent with balance API)
    const { data: balanceData } = await supabase
      .from("balances")
      .select("available_usdt")
      .eq("user_id", user.id)
      .single();

    if (!balanceData) {
      return NextResponse.json(
        { error: "Unable to fetch balance" },
        { status: 500 }
      );
    }

    const availableBalance = Number(balanceData.available_usdt || 0);

    if (numericAmount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${availableBalance.toFixed(2)} USDT` },
        { status: 400 }
      );
    }

    // Check for existing pending withdrawal
    const { data: pendingWithdrawal } = await supabase
      .from("withdrawals")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (pendingWithdrawal) {
      return NextResponse.json(
        { error: "You already have a pending withdrawal request" },
        { status: 409 }
      );
    }

    // Calculate fees (3% withdrawal fee)
    const feePercent = 0.03; // 3%
    const fee = numericAmount * feePercent;
    const netAmount = numericAmount - fee;

    // Create withdrawal request in standard withdrawals table
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount_usdt: numericAmount,
        fee_usdt: fee,
        net_amount_usdt: netAmount,
        address: toAddress,
        network: "TRC20",
        status: "pending"
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error("Error creating hot wallet withdrawal:", withdrawalError);
      return NextResponse.json(
        { error: "Failed to create withdrawal request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount_usdt,
        fee: withdrawal.fee_usdt,
        net_amount: withdrawal.net_amount_usdt,
        to_address: withdrawal.address,
        status: withdrawal.status,
        created_at: withdrawal.created_at
      }
    });

  } catch (error) {
    console.error("Hot wallet withdrawal request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
