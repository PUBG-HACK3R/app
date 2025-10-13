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

    console.log('🔧 FIXING: Missing principal unlock transactions for completed investments...');

    // Get completed investments
    const { data: completedInvestments, error: fetchError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed");

    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch completed investments", 
        details: fetchError.message 
      }, { status: 500 });
    }

    // Get existing principal unlock transactions
    const { data: existingUnlockTxs, error: txError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "investment_return");

    if (txError) {
      return NextResponse.json({ 
        error: "Failed to fetch existing unlock transactions", 
        details: txError.message 
      }, { status: 500 });
    }

    // Find investments missing principal unlock transactions
    const missingUnlocks = (completedInvestments || []).filter(investment => 
      !(existingUnlockTxs || []).some(tx => tx.reference_id === investment.id)
    );

    console.log(`Found ${missingUnlocks.length} completed investments missing principal unlock transactions`);

    let fixedCount = 0;
    const fixedInvestments = [];
    const errors = [];

    // Get current user balance
    const { data: currentBalance } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", user.id)
      .single();

    let runningBalance = currentBalance?.available_balance || 0;

    for (const investment of missingUnlocks) {
      try {
        console.log(`Creating missing principal unlock transaction for investment ${investment.id}: $${investment.amount_invested}`);

        // Create the missing principal unlock transaction
        // Note: We're creating this as a historical record, so we don't actually modify the balance
        const { data: unlockTransaction } = await admin
          .from("transaction_logs")
          .insert({
            user_id: user.id,
            type: "investment_return",
            amount_usdt: investment.amount_invested,
            description: `Investment completed - Principal unlocked`,
            reference_id: investment.id,
            balance_before: runningBalance,
            balance_after: runningBalance, // Not changing current balance since this is historical
            created_at: investment.updated_at || investment.end_date // Use the investment completion time
          })
          .select()
          .single();

        fixedInvestments.push({
          investment_id: investment.id,
          amount_invested: investment.amount_invested,
          duration_days: investment.duration_days,
          end_date: investment.end_date,
          transaction_id: unlockTransaction?.id,
          created_at: investment.updated_at || investment.end_date
        });

        fixedCount++;
        console.log(`✅ Created principal unlock transaction for investment ${investment.id}`);

      } catch (error: any) {
        console.error(`Error creating unlock transaction for investment ${investment.id}:`, error);
        errors.push(`Investment ${investment.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Missing principal unlock transactions fixed",
      results: {
        completed_investments_total: completedInvestments?.length || 0,
        existing_unlock_transactions: existingUnlockTxs?.length || 0,
        missing_unlocks_found: missingUnlocks.length,
        transactions_created: fixedCount,
        fixed_investments: fixedInvestments,
        errors: errors.length > 0 ? errors : undefined
      },
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('Fix missing principal unlocks error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
