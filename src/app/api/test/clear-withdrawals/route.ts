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

    // Clear all pending withdrawals for this user
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

    return NextResponse.json({
      success: true,
      deletedCount: deletedWithdrawals?.length || 0,
      message: `Cleared ${deletedWithdrawals?.length || 0} pending withdrawals`
    });

  } catch (error) {
    console.error("Clear withdrawals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
