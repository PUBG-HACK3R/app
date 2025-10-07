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

    // First, completely clear all pending withdrawals
    await admin
      .from("withdrawals")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");

    // Use raw SQL to insert with proper timestamp
    const { data: result, error: sqlError } = await admin.rpc('create_test_withdrawal', {
      p_user_id: user.id,
      p_amount: 50,
      p_fee: 2.5,
      p_net_amount: 47.5,
      p_address: 'TTest123456789012345678901234567890',
      p_network: 'TRC20'
    });

    if (sqlError) {
      console.log("RPC failed, trying direct insert with NOW()");
      
      // Fallback: Use direct SQL with NOW()
      const { data: directResult, error: directError } = await admin
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount_usdt: 50,
          fee_usdt: 2.5,
          net_amount_usdt: 47.5,
          address: "TTest123456789012345678901234567890",
          network: "TRC20",
          status: "pending"
          // Don't specify created_at - let database set it
        })
        .select()
        .single();

      if (directError) {
        return NextResponse.json({ error: directError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        method: "direct_insert",
        withdrawal: directResult,
        message: "Created withdrawal with database default timestamp"
      });
    }

    return NextResponse.json({
      success: true,
      method: "rpc_function",
      result: result,
      message: "Created withdrawal using RPC function"
    });

  } catch (error) {
    console.error("Manual withdrawal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
