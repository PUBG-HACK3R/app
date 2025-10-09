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
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, amount, reason } = await request.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // First, get current balance or create if doesn't exist
    const { data: currentBalance } = await admin
      .from("user_balances")
      .select("available_balance, total_deposited")
      .eq("user_id", userId)
      .single();

    // Update user balance
    const { error: balanceError } = await admin
      .from("user_balances")
      .upsert({
        user_id: userId,
        available_balance: (currentBalance?.available_balance || 0) + amount,
        total_deposited: (currentBalance?.total_deposited || 0) + amount
      }, {
        onConflict: 'user_id'
      });

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
    }

    // Log the transaction
    const { error: logError } = await admin
      .from("transaction_logs")
      .insert({
        user_id: userId,
        type: "deposit",
        amount_usdt: amount,
        description: reason || "Admin topup",
        status: "completed"
      });

    if (logError) {
      console.error("Transaction log error:", logError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Topup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
