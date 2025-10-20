import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get all transaction logs for the user
    const { data: transactions, error: txError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txError) {
      console.error("Error fetching transactions:", txError);
      return NextResponse.json({ 
        error: "Failed to fetch transactions", 
        details: txError.message 
      }, { status: 500 });
    }

    // Get withdrawal transactions
    const { data: withdrawals, error: withdrawalError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get deposit transactions
    const { data: deposits, error: depositError } = await admin
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Format withdrawal transactions
    const withdrawalTxs = (withdrawals || []).map((w: any) => ({
      id: w.id,
      type: 'withdrawal',
      amount_usdt: w.amount_usdt,
      status: w.status,
      description: `Withdrawal to ${w.wallet_address?.substring(0, 8)}...${w.wallet_address?.substring(w.wallet_address.length - 6)} (${w.status})`,
      created_at: w.created_at,
      processed_at: w.processed_at,
      admin_notes: w.admin_notes,
      reference_id: w.id
    }));

    // Format deposit transactions
    const depositTxs = (deposits || []).map((d: any) => ({
      id: d.id,
      type: 'deposit',
      amount_usdt: d.amount_usdt,
      status: d.status,
      description: `Deposit via ${d.payment_method || 'crypto'} (${d.status})`,
      created_at: d.created_at,
      processed_at: d.processed_at || d.updated_at,
      reference_id: d.id,
      order_id: d.order_id
    }));

    // Combine all transactions
    const allTransactions = [
      ...(transactions || []).map((t: any) => ({
        id: t.id,
        type: t.type,
        amount_usdt: t.amount_usdt,
        status: t.status || 'completed',
        description: t.description,
        created_at: t.created_at,
        reference_id: t.reference_id,
        balance_before: t.balance_before,
        balance_after: t.balance_after
      })),
      ...withdrawalTxs,
      ...depositTxs
    ];

    // Sort by date and remove duplicates
    const uniqueTransactions = allTransactions
      .filter((tx, index, self) => 
        index === self.findIndex(t => t.id === tx.id && t.type === tx.type)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    console.log(`Found ${uniqueTransactions.length} transactions for user ${user.id}`);
    console.log('Transaction logs:', transactions?.length || 0);
    console.log('Withdrawals:', withdrawals?.length || 0);
    console.log('Deposits:', deposits?.length || 0);
    console.log('Sample transactions:', uniqueTransactions.slice(0, 3));

    return NextResponse.json({
      success: true,
      transactions: uniqueTransactions,
      counts: {
        transaction_logs: transactions?.length || 0,
        withdrawals: withdrawals?.length || 0,
        deposits: deposits?.length || 0,
        total: uniqueTransactions.length
      }
    });

  } catch (error: any) {
    console.error("User transactions error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
