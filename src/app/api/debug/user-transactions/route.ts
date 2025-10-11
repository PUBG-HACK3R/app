import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("=== USER TRANSACTIONS DEBUG ===");
    console.log("Auth error:", authError);
    console.log("User:", user ? { id: user.id, email: user.email } : null);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated", 
        authError: authError?.message,
        user: user ? "exists" : "null"
      }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Test direct transaction_logs query
    const { data: transactions, error: txError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    console.log("Transaction logs query result:", {
      count: transactions?.length || 0,
      error: txError?.message,
      sample: transactions?.[0]
    });

    // Test withdrawals query
    const { data: withdrawals, error: withdrawalError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    console.log("Withdrawals query result:", {
      count: withdrawals?.length || 0,
      error: withdrawalError?.message,
      sample: withdrawals?.[0]
    });

    // Test deposits query
    const { data: deposits, error: depositError } = await admin
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    console.log("Deposits query result:", {
      count: deposits?.length || 0,
      error: depositError?.message,
      sample: deposits?.[0]
    });

    // Test if there are ANY transactions for ANY user
    const { data: allTx, error: allTxError } = await admin
      .from("transaction_logs")
      .select("user_id, type, amount_usdt, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    console.log("All transactions in DB:", {
      count: allTx?.length || 0,
      error: allTxError?.message,
      sample: allTx?.[0]
    });

    return NextResponse.json({
      success: true,
      user_id: user.id,
      user_email: user.email,
      queries: {
        transaction_logs: {
          count: transactions?.length || 0,
          error: txError?.message || null,
          data: transactions || []
        },
        withdrawals: {
          count: withdrawals?.length || 0,
          error: withdrawalError?.message || null,
          data: withdrawals || []
        },
        deposits: {
          count: deposits?.length || 0,
          error: depositError?.message || null,
          data: deposits || []
        },
        all_transactions_sample: {
          count: allTx?.length || 0,
          error: allTxError?.message || null,
          data: allTx || []
        }
      }
    });

  } catch (error: any) {
    console.error("Debug user transactions error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
