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

    // Delete ALL pending withdrawals (they have corrupted timestamps)
    const { data: deletedWithdrawals, error: deleteError } = await admin
      .from("withdrawals")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select();

    if (deleteError) {
      console.error("Error deleting withdrawals:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Create a fresh withdrawal with correct current timestamp
    // Force the timestamp to be exactly now
    const now = new Date();
    const correctTimestamp = now.toISOString();
    
    console.log("Creating withdrawal with timestamp:", correctTimestamp);
    
    const { data: newWithdrawal, error: createError } = await admin
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount_usdt: 50,
        fee_usdt: 2.5,
        net_amount_usdt: 47.5,
        address: "TTest123456789012345678901234567890",
        network: "TRC20",
        status: "pending",
        created_at: correctTimestamp
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating new withdrawal:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Create transaction record
    await admin.from("transactions").insert({
      user_id: user.id,
      type: "withdrawal",
      amount_usdt: 50,
      description: "Test withdrawal with fixed timestamp",
      status: "pending"
    });

    return NextResponse.json({
      success: true,
      deletedCount: deletedWithdrawals?.length || 0,
      newWithdrawal: {
        id: newWithdrawal.id,
        created_at: newWithdrawal.created_at,
        timestamp_check: {
          created: correctTimestamp,
          now: now.toISOString(),
          difference_ms: new Date(newWithdrawal.created_at).getTime() - now.getTime()
        }
      },
      message: "Fixed timestamp issues and created fresh withdrawal"
    });

  } catch (error) {
    console.error("Fix timestamps error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
