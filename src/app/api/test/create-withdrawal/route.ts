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

    const admin = getSupabaseAdminClient();

    // First, clean up any existing pending withdrawals for this user
    await admin
      .from("withdrawals")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");

    // Create a fresh test withdrawal with explicit current timestamp
    const currentTime = new Date().toISOString();
    
    const { data: withdrawal, error: withdrawalError } = await admin
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount_usdt: 50,
        fee_usdt: 2.5,
        net_amount_usdt: 47.5,
        address: "TTest123456789012345678901234567890",
        network: "TRC20",
        status: "pending",
        created_at: currentTime
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error("Error creating test withdrawal:", withdrawalError);
      return NextResponse.json({ error: withdrawalError.message }, { status: 500 });
    }

    // Create transaction record
    await admin.from("transactions").insert({
      user_id: user.id,
      type: "withdrawal",
      amount_usdt: 50,
      description: "Test withdrawal request",
      status: "pending",
      withdrawal_id: withdrawal.id
    });

    return NextResponse.json({
      success: true,
      withdrawal,
      message: "Test withdrawal created successfully"
    });

  } catch (error) {
    console.error("Test withdrawal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
