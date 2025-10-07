import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find stuck NOWPayments deposits
    const { data: stuckDeposits } = await admin
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "waiting");

    if (!stuckDeposits || stuckDeposits.length === 0) {
      return NextResponse.json({
        message: "No stuck deposits found"
      });
    }

    // Delete stuck deposits (they were never completed)
    const { error: deleteError } = await admin
      .from("deposits")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "waiting");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: `Cleaned up ${stuckDeposits.length} stuck deposit(s)`,
      deleted_deposits: stuckDeposits.map(d => ({
        order_id: d.order_id,
        amount: d.amount_usdt,
        status: d.status,
        created_at: d.created_at
      }))
    });

  } catch (error) {
    console.error("Clean stuck deposit API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
