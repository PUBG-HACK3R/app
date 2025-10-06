import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const body = await request.json();
    
    const { userId, type = "deposit", amount = 25.50 } = body;
    
    if (!userId) {
      return NextResponse.json({ 
        error: "userId is required" 
      }, { status: 400 });
    }

    // Create a test transaction
    const { data: transaction, error: txError } = await admin
      .from("transactions")
      .insert({
        user_id: userId,
        type: type,
        amount_usdt: amount,
        status: "completed",
        description: `Test ${type} transaction`,
        meta: {
          test: true,
          created_by: "debug_endpoint"
        }
      })
      .select()
      .single();

    if (txError) {
      return NextResponse.json({
        success: false,
        error: txError.message
      }, { status: 500 });
    }

    // Also update user balance if it's a deposit
    if (type === "deposit") {
      const { data: balanceData, error: balanceError } = await admin
        .from("balances")
        .select("available_usdt")
        .eq("user_id", userId)
        .maybeSingle();

      const currentBalance = Number(balanceData?.available_usdt || 0);
      const newBalance = currentBalance + Number(amount);

      await admin
        .from("balances")
        .upsert({
          user_id: userId,
          available_usdt: newBalance
        }, { onConflict: "user_id" });
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} transaction created successfully`,
      transaction: transaction,
      amount: amount
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
