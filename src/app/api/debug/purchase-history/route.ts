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

    // Get ALL transactions for this user
    const { data: allTransactions, error: txError } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Get current balance
    const { data: balance, error: balanceError } = await admin
      .from("balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Analyze transactions by type
    const transactionsByType = {
      investment: allTransactions?.filter(tx => tx.type === 'investment') || [],
      earning: allTransactions?.filter(tx => tx.type === 'earning') || [],
      deposit: allTransactions?.filter(tx => tx.type === 'deposit') || [],
      withdrawal: allTransactions?.filter(tx => tx.type === 'withdrawal') || [],
      other: allTransactions?.filter(tx => !['investment', 'earning', 'deposit', 'withdrawal'].includes(tx.type)) || []
    };

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      current_balance: balance,
      all_transactions: allTransactions || [],
      transactions_by_type: transactionsByType,
      summary: {
        total_transactions: allTransactions?.length || 0,
        investment_count: transactionsByType.investment.length,
        investment_total: transactionsByType.investment.reduce((sum, tx) => sum + (Number(tx.amount_usdt) || 0), 0),
        earning_count: transactionsByType.earning.length,
        earning_total: transactionsByType.earning.reduce((sum, tx) => sum + (Number(tx.amount_usdt) || 0), 0),
        recent_investments: transactionsByType.investment.slice(0, 5)
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
