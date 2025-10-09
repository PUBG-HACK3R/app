import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, address, network } = body;

    // Validate input
    if (!amount || !address || !network) {
      return NextResponse.json(
        { error: "Missing required fields: amount, address, network" },
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
    if (numericAmount < 30) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $30 USDT" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isValidAddress(address, network)) {
      return NextResponse.json(
        { error: `Invalid ${network} address format` },
        { status: 400 }
      );
    }

    // Use admin client to check balance and create withdrawal
    const admin = getSupabaseAdminClient();

    // Check user balance from balances table (consistent with balance API)
    const { data: balanceData } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", user.id)
      .single();

    if (!balanceData) {
      return NextResponse.json(
        { error: "Unable to fetch balance" },
        { status: 500 }
      );
    }

    const availableBalance = Number(balanceData.available_balance || 0);

    if (numericAmount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${availableBalance.toFixed(2)} USDT` },
        { status: 400 }
      );
    }

    // Check for existing pending withdrawal
    const { data: pendingWithdrawal } = await admin
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

    // Calculate fees (5% platform fee, no network fee for TRC20)
    const platformFeePercent = 0.05; // 5%
    const platformFee = numericAmount * platformFeePercent;
    const networkFee = 0; // No network fee for TRC20
    const totalFees = platformFee;
    const netAmount = numericAmount - totalFees;

    if (netAmount <= 0) {
      return NextResponse.json(
        { error: "Amount too small after fees" },
        { status: 400 }
      );
    }

    // Start transaction: Create withdrawal request AND deduct balance immediately
    const { data: withdrawal, error: withdrawalError } = await admin
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount_usdt: numericAmount,
        fee_usdt: totalFees,
        net_amount_usdt: netAmount,
        address: address,
        network: network,
        status: "pending"
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error("Error creating withdrawal:", withdrawalError);
      return NextResponse.json(
        { error: "Failed to create withdrawal request" },
        { status: 500 }
      );
    }

    // Immediately deduct the full amount from user's balance
    const newBalance = availableBalance - numericAmount;
    const { error: balanceError } = await admin
      .from("user_balances")
      .update({ available_balance: newBalance })
      .eq("user_id", user.id);

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      // Rollback: Delete the withdrawal request
      await admin.from("withdrawals").delete().eq("id", withdrawal.id);
      return NextResponse.json(
        { error: "Failed to process withdrawal - balance update failed" },
        { status: 500 }
      );
    }

    // Create transaction record for the withdrawal
    await admin.from("transaction_logs").insert({
      user_id: user.id,
      type: "withdrawal",
      amount_usdt: numericAmount,
      description: `Withdrawal to ${address.substring(0, 8)}...${address.substring(address.length - 6)}`,
      status: "pending",
      withdrawal_id: withdrawal.id
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully! Processing has started.",
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount_usdt,
        fee: withdrawal.fee_usdt,
        net_amount: withdrawal.net_amount_usdt,
        address: withdrawal.address,
        network: withdrawal.network,
        status: withdrawal.status,
        created_at: withdrawal.created_at
      }
    });

  } catch (error) {
    console.error("Withdrawal request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function isValidAddress(address: string, network: string): boolean {
  if (!address) return false;
  
  switch (network) {
    case "TRC20":
      return address.startsWith("T") && address.length === 34;
    case "ERC20":
    case "BEP20":
    case "ARBITRUM":
      return address.startsWith("0x") && address.length === 42;
    default:
      return false;
  }
}
