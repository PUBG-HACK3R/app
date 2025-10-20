import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Check if user already has a signup bonus
    const { data: existingBonus, error: checkError } = await admin
      .from("transaction_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "earning")
      .eq("description", "Welcome bonus for new account signup")
      .single();

    if (existingBonus) {
      return NextResponse.json({
        success: false,
        message: "User already has a signup bonus transaction",
        existing_transaction_id: existingBonus.id
      });
    }

    // Create the signup bonus transaction
    const { data: transaction, error: txError } = await admin
      .from("transaction_logs")
      .insert({
        user_id: user.id,
        type: "earning",
        amount_usdt: 5.00,
        description: "Welcome bonus for new account signup",
        balance_before: 0,
        balance_after: 5.00,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (txError) {
      console.error("Failed to create signup bonus:", txError);
      return NextResponse.json({ 
        error: "Failed to create signup bonus", 
        details: txError.message 
      }, { status: 500 });
    }

    // Also update user balance
    const { error: balanceError } = await admin
      .from("user_balances")
      .upsert({
        user_id: user.id,
        available_balance: 5.00,
        locked_balance: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        total_earned: 5.00
      });

    if (balanceError) {
      console.warn("Failed to update balance:", balanceError);
    }

    console.log("✅ Successfully created signup bonus for user:", user.id);

    return NextResponse.json({
      success: true,
      transaction: transaction,
      message: "Signup bonus created successfully! Check your transactions.",
      user_id: user.id
    });

  } catch (error: any) {
    console.error("Signup bonus creation error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
