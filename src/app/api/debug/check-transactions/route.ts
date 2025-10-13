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

    // Get user's investments
    const { data: investments, error: investmentError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Get user's transaction logs
    const { data: transactions, error: transactionError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    // Get user's balance
    const { data: balance, error: balanceError } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Analyze transactions by type
    const transactionsByType = (transactions || []).reduce((acc: any, tx: any) => {
      if (!acc[tx.type]) acc[tx.type] = [];
      acc[tx.type].push(tx);
      return acc;
    }, {});

    // Check for missing principal unlock transactions
    const completedInvestments = (investments || []).filter(inv => inv.status === 'completed');
    const principalUnlockTxs = transactions?.filter(tx => tx.type === 'investment_return') || [];
    
    const missingPrincipalUnlocks = completedInvestments.filter(inv => 
      !principalUnlockTxs.some(tx => tx.reference_id === inv.id)
    );

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        current_balance: balance,
        investments: {
          total: investments?.length || 0,
          active: investments?.filter(inv => inv.status === 'active').length || 0,
          completed: completedInvestments.length,
          completed_investments: completedInvestments.map(inv => ({
            id: inv.id,
            amount_invested: inv.amount_invested,
            total_earned: inv.total_earned,
            duration_days: inv.duration_days,
            end_date: inv.end_date,
            status: inv.status
          }))
        },
        transactions: {
          total: transactions?.length || 0,
          by_type: Object.keys(transactionsByType).map(type => ({
            type,
            count: transactionsByType[type].length,
            total_amount: transactionsByType[type].reduce((sum: number, tx: any) => sum + (tx.amount_usdt || 0), 0)
          })),
          recent_transactions: (transactions || []).slice(0, 10).map(tx => ({
            id: tx.id,
            type: tx.type,
            amount_usdt: tx.amount_usdt,
            description: tx.description,
            created_at: tx.created_at,
            reference_id: tx.reference_id
          }))
        },
        analysis: {
          completed_investments_count: completedInvestments.length,
          principal_unlock_transactions_count: principalUnlockTxs.length,
          missing_principal_unlocks: missingPrincipalUnlocks.length,
          missing_principal_unlock_details: missingPrincipalUnlocks.map(inv => ({
            investment_id: inv.id,
            amount_invested: inv.amount_invested,
            end_date: inv.end_date,
            completed_at: inv.updated_at
          }))
        }
      }
    });

  } catch (error: any) {
    console.error('Check transactions error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
