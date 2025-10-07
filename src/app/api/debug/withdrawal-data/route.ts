import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all withdrawals for this user
    const { data: withdrawals, error: withdrawalError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (withdrawalError) {
      return NextResponse.json({ error: withdrawalError.message }, { status: 500 });
    }

    // Analyze each withdrawal
    const now = new Date().getTime();
    const analysisResults = (withdrawals || []).map(w => {
      const created = new Date(w.created_at).getTime();
      const elapsed = now - created;
      const fifteenMinutes = 15 * 60 * 1000;
      const remaining = Math.max(0, fifteenMinutes - elapsed);

      return {
        id: w.id,
        status: w.status,
        amount_usdt: w.amount_usdt,
        created_at: w.created_at,
        created_timestamp: created,
        current_timestamp: now,
        elapsed_ms: elapsed,
        elapsed_minutes: Math.floor(elapsed / 60000),
        remaining_ms: remaining,
        remaining_minutes: Math.floor(remaining / 60000),
        is_future: elapsed < 0,
        is_expired: remaining === 0,
        is_very_future: elapsed < -60000
      };
    });

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      withdrawals_count: withdrawals?.length || 0,
      analysis: analysisResults
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
