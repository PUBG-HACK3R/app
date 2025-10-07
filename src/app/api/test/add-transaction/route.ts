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
      return NextResponse.json({ 
        error: "Unauthorized", 
        authError: authError?.message,
        hasUser: !!user 
      }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Add a test transaction
    const { data: transaction, error: txError } = await admin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "deposit",
        amount_usdt: 100,
        status: "completed",
        description: "Test deposit transaction"
      })
      .select()
      .single();

    if (txError) {
      console.error("Error creating test transaction:", txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Also ensure user has a balance record
    const { data: existingBalance } = await admin
      .from("balances")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!existingBalance) {
      await admin
        .from("balances")
        .insert({
          user_id: user.id,
          available_usdt: 100
        });
    } else {
      await admin
        .from("balances")
        .update({
          available_usdt: (existingBalance.available_usdt || 0) + 100
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      transaction,
      message: "Test transaction added successfully"
    });

  } catch (error) {
    console.error("Test transaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
