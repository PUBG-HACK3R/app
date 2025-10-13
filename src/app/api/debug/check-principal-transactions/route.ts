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

    // Get completed investments for this user
    const { data: completedInvestments, error: investmentError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (investmentError) {
      return NextResponse.json({ 
        error: "Failed to fetch completed investments", 
        details: investmentError.message 
      }, { status: 500 });
    }

    // Get all transaction logs for this user
    const { data: transactions, error: transactionError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (transactionError) {
      return NextResponse.json({ 
        error: "Failed to fetch transactions", 
        details: transactionError.message 
      }, { status: 500 });
    }

    // Filter transactions by type
    const investmentPurchases = transactions?.filter(t => t.type === "investment") || [];
    const earnings = transactions?.filter(t => t.type === "earning") || [];
    const principalReturns = transactions?.filter(t => t.type === "investment_return") || [];

    // Check which completed investments have principal return transactions
    const investmentAnalysis = completedInvestments?.map(investment => {
      const principalReturn = principalReturns.find(t => t.reference_id === investment.id);
      const relatedEarnings = earnings.filter(t => 
        t.reference_id && 
        transactions?.find(tr => tr.id === t.reference_id && tr.reference_id === investment.id)
      );
      
      return {
        investment_id: investment.id,
        amount_invested: investment.amount_invested,
        total_earned: investment.total_earned,
        status: investment.status,
        end_date: investment.end_date,
        updated_at: investment.updated_at,
        has_principal_return_transaction: !!principalReturn,
        principal_return_transaction: principalReturn || null,
        earnings_count: relatedEarnings.length
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        completed_investments_count: completedInvestments?.length || 0,
        total_transactions: transactions?.length || 0,
        transaction_breakdown: {
          investment_purchases: investmentPurchases.length,
          earnings: earnings.length,
          principal_returns: principalReturns.length
        },
        investment_analysis: investmentAnalysis,
        recent_transactions: transactions?.slice(0, 10) || [],
        all_principal_returns: principalReturns
      }
    });

  } catch (error: any) {
    console.error('Check principal transactions error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
