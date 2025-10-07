import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated", 
        details: authError 
      }, { status: 401 });
    }

    // Check balances table
    const { data: balanceData, error: balanceError } = await admin
      .from("balances")
      .select("*")
      .eq("user_id", user.id);

    // Check profiles table (old balance location)
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("balance_usdt")
      .eq("id", user.id);

    // Check transactions for this user
    const { data: transactions, error: txError } = await admin
      .from("transactions")
      .select("type, amount_usdt, created_at, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate balance from transactions
    const calculatedBalance = (transactions || []).reduce((sum, tx) => {
      if (tx.type === "deposit" || tx.type === "earning" || tx.type === "admin_topup") {
        return sum + Number(tx.amount_usdt);
      } else if (tx.type === "withdrawal" || tx.type === "purchase") {
        return sum - Number(tx.amount_usdt);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      balances_table: {
        exists: !balanceError && balanceData && balanceData.length > 0,
        data: balanceData || [],
        error: balanceError
      },
      profiles_table: {
        data: profileData || [],
        error: profileError
      },
      transactions: {
        count: transactions?.length || 0,
        recent: transactions || [],
        calculated_balance: calculatedBalance,
        error: txError
      },
      debug_info: {
        timestamp: new Date().toISOString(),
        balance_from_api: "Will call /api/user/balance to compare"
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug check failed",
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
