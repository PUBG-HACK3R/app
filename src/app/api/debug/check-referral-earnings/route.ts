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

    console.log('🔍 CHECKING: Referral earnings data...');
    console.log('User ID:', user.id);

    // Check referral commissions table
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    console.log('Referral commissions:', commissions);

    // Check transactions table for referral_commission type
    const { data: transactions, error: transactionsError } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "referral_commission");

    console.log('Referral commission transactions:', transactions);

    // Check all transactions for this user
    const { data: allTransactions, error: allTransactionsError } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log('All user transactions:', allTransactions);

    // Calculate totals
    const totalCommissionAmount = commissions?.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;
    const totalTransactionAmount = transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      message: "Referral earnings check completed",
      user_id: user.id,
      data: {
        referral_commissions: {
          count: commissions?.length || 0,
          total_amount: totalCommissionAmount,
          records: commissions || []
        },
        referral_transactions: {
          count: transactions?.length || 0,
          total_amount: totalTransactionAmount,
          records: transactions || []
        },
        all_transactions: {
          count: allTransactions?.length || 0,
          records: allTransactions?.slice(0, 10) || [] // Show last 10
        }
      },
      analysis: {
        has_referral_commissions: (commissions?.length || 0) > 0,
        has_referral_transactions: (transactions?.length || 0) > 0,
        commission_transaction_mismatch: totalCommissionAmount !== totalTransactionAmount,
        expected_earnings: totalCommissionAmount,
        actual_transactions: totalTransactionAmount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Check referral earnings error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
