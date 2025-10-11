import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { withdrawalId, reason } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json({ error: "Withdrawal ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Get withdrawal details first
    const { data: withdrawal } = await admin
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    // Update withdrawal status
    const { error: updateError } = await admin
      .from("withdrawals")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
        admin_notes: reason || `Rejected by ${profile.email || user.email}`
      })
      .eq("id", withdrawalId);

    if (updateError) {
      console.error("Withdrawal rejection error:", updateError);
      return NextResponse.json({ error: "Failed to reject withdrawal" }, { status: 500 });
    }

    // Get current balance and refund the amount
    const { data: currentBalance } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", withdrawal.user_id)
      .single();

    const oldBalance = currentBalance?.available_balance || 0;
    const newBalance = oldBalance + withdrawal.amount_usdt;

    // Refund the amount to user's available balance
    const { error: refundError } = await admin
      .from("user_balances")
      .update({
        available_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", withdrawal.user_id);

    if (refundError) {
      console.error("Refund error:", refundError);
      return NextResponse.json({ error: "Failed to refund amount" }, { status: 500 });
    }

    // Log the rejection and refund transaction
    await admin.from("transaction_logs").insert({
      user_id: withdrawal.user_id,
      type: "refund",
      amount_usdt: withdrawal.amount_usdt,
      description: `Withdrawal rejected and refunded - ${withdrawal.wallet_address.substring(0, 8)}...${withdrawal.wallet_address.substring(withdrawal.wallet_address.length - 6)}`,
      status: "completed",
      reference_id: withdrawalId,
      balance_before: oldBalance,
      balance_after: newBalance,
      meta: {
        reason: reason || "Rejected by admin",
        rejected_by: profile.email,
        admin_id: user.id,
        original_amount: withdrawal.amount_usdt,
        fee: withdrawal.fee_usdt
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Withdrawal rejection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
