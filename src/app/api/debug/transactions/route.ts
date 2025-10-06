import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get all transactions
    const { data: allTransactions, error: txError } = await admin
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get all deposit transactions
    let depositTransactions = null;
    try {
      const { data, error } = await admin
        .from("deposit_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      depositTransactions = data;
    } catch (error) {
      depositTransactions = "Table not found";
    }

    // Get all balances
    const { data: allBalances, error: balanceError } = await admin
      .from("balances")
      .select("*")
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        transactions: {
          count: allTransactions?.length || 0,
          data: allTransactions,
          error: txError?.message
        },
        deposit_transactions: {
          count: Array.isArray(depositTransactions) ? depositTransactions.length : 0,
          data: depositTransactions,
        },
        balances: {
          count: allBalances?.length || 0,
          data: allBalances,
          error: balanceError?.message
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
