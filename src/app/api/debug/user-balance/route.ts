import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Check user profile
    const { data: profile } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Check user balance
    const { data: balance } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Check recent transactions
    const { data: transactions } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      user_id: user.id,
      email: user.email,
      profile: profile || "No profile found",
      balance: balance || "No balance record found",
      recent_transactions: transactions || [],
      debug_info: {
        has_profile: !!profile,
        has_balance: !!balance,
        transaction_count: transactions?.length || 0
      }
    });

  } catch (error: any) {
    console.error("Debug user balance error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
