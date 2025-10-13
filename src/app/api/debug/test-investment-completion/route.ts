import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();

    console.log('🧪 TESTING: Complete investment flow with transaction logging...');

    // Get user's active investments that should be completed (for testing)
    const { data: activeInvestments, error: fetchError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch active investments", 
        details: fetchError.message 
      }, { status: 500 });
    }

    // Get current transactions before processing
    const { data: transactionsBefore, error: txBeforeError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    console.log(`Found ${activeInvestments?.length || 0} active investments`);
    console.log(`Current transaction count: ${transactionsBefore?.length || 0}`);

    // Simulate investment completion by temporarily setting end_date to past
    const testResults = [];
    
    for (const investment of activeInvestments || []) {
      const originalEndDate = investment.end_date;
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      
      try {
        // Temporarily set end_date to past to trigger completion
        await admin
          .from("user_investments")
          .update({ end_date: pastDate.toISOString() })
          .eq("id", investment.id);

        console.log(`Set investment ${investment.id} end_date to past for testing`);

        // Call the earnings check endpoint to process completion
        const earningsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/check-earnings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const earningsResult = await earningsResponse.json();
        
        // Restore original end_date
        await admin
          .from("user_investments")
          .update({ end_date: originalEndDate })
          .eq("id", investment.id);

        console.log(`Restored investment ${investment.id} original end_date`);

        testResults.push({
          investment_id: investment.id,
          amount_invested: investment.amount_invested,
          duration_days: investment.duration_days,
          daily_roi_percentage: investment.daily_roi_percentage,
          is_end_payout_plan: investment.duration_days >= 30,
          earnings_processing_result: earningsResult,
          test_status: earningsResult.success ? 'success' : 'failed'
        });

      } catch (error: any) {
        console.error(`Error testing investment ${investment.id}:`, error);
        testResults.push({
          investment_id: investment.id,
          test_status: 'error',
          error: error.message
        });
      }
    }

    // Get transactions after processing
    const { data: transactionsAfter, error: txAfterError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Analyze new transactions
    const newTransactions = (transactionsAfter || []).filter(tx => 
      !(transactionsBefore || []).some(oldTx => oldTx.id === tx.id)
    );

    const principalUnlockTxs = newTransactions.filter(tx => tx.type === 'investment_return');
    const earningTxs = newTransactions.filter(tx => tx.type === 'earning');

    return NextResponse.json({
      success: true,
      message: "Investment completion flow tested",
      results: {
        active_investments_tested: activeInvestments?.length || 0,
        test_results: testResults,
        transaction_analysis: {
          transactions_before_count: transactionsBefore?.length || 0,
          transactions_after_count: transactionsAfter?.length || 0,
          new_transactions_count: newTransactions.length,
          principal_unlock_transactions: principalUnlockTxs.length,
          earning_transactions: earningTxs.length,
          new_transactions: newTransactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount_usdt: tx.amount_usdt,
            description: tx.description,
            created_at: tx.created_at
          }))
        }
      },
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('Test investment completion error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
