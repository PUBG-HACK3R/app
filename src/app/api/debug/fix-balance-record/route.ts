import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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

    // Calculate correct balance from transactions
    const { data: transactions, error: txError } = await admin
      .from("transactions")
      .select("type, amount_usdt, created_at, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (txError) {
      return NextResponse.json({ 
        error: "Failed to fetch transactions", 
        details: txError 
      }, { status: 500 });
    }

    // Calculate balance from all transactions
    let calculatedBalance = 0;
    const transactionLog = [];

    for (const tx of transactions || []) {
      const amount = Number(tx.amount_usdt);
      if (tx.type === "deposit" || tx.type === "earning" || tx.type === "admin_topup") {
        calculatedBalance += amount;
        transactionLog.push(`+${amount} (${tx.type}): ${tx.description}`);
      } else if (tx.type === "withdrawal" || tx.type === "purchase") {
        calculatedBalance -= amount;
        transactionLog.push(`-${amount} (${tx.type}): ${tx.description}`);
      }
    }

    // Check if balance record exists
    const { data: existingBalance } = await admin
      .from("balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let balanceResult;
    if (existingBalance) {
      // Update existing record
      const { data: updatedBalance, error: updateError } = await admin
        .from("balances")
        .update({ 
          available_usdt: calculatedBalance,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ 
          error: "Failed to update balance", 
          details: updateError 
        }, { status: 500 });
      }

      balanceResult = {
        action: "updated",
        old_balance: existingBalance.available_usdt,
        new_balance: calculatedBalance,
        record: updatedBalance
      };
    } else {
      // Create new balance record
      const { data: newBalance, error: insertError } = await admin
        .from("balances")
        .insert({
          user_id: user.id,
          available_usdt: calculatedBalance,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ 
          error: "Failed to create balance record", 
          details: insertError 
        }, { status: 500 });
      }

      balanceResult = {
        action: "created",
        new_balance: calculatedBalance,
        record: newBalance
      };
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      calculated_balance: calculatedBalance,
      transaction_count: transactions?.length || 0,
      transaction_log: transactionLog,
      balance_record: balanceResult,
      message: `Balance record ${balanceResult.action} successfully with $${calculatedBalance.toFixed(2)} USDT`
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Fix balance failed",
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
