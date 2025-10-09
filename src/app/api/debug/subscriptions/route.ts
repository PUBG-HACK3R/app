import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    // Get all subscriptions for this user
    const { data: subscriptions, error } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json({ error: "Database error", details: error }, { status: 500 });
    }

    // Also get user's balance
    const { data: balanceData } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      user_id: user.id,
      balance: balanceData?.available_balance || 0,
      subscription_count: subscriptions?.length || 0,
      subscriptions: subscriptions || []
    });

  } catch (error) {
    console.error("Debug subscriptions API error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
