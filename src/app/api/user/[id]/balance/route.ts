import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // Verify user can access this data (own data or admin)
    if (user.id !== userId) {
      // Check if user is admin
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get user balance
    const { data: balanceData, error: balanceError } = await admin
      .from('balances')
      .select('available_usdt, updated_at')
      .eq('user_id', userId)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw balanceError;
    }

    const currentBalance = Number(balanceData?.available_usdt || 0);

    // Get recent transactions for balance breakdown
    const { data: transactions, error: txError } = await admin
      .from('transactions')
      .select('type, amount_usdt, created_at, status, description')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      throw txError;
    }

    // Get pending deposits
    const { data: pendingDeposits, error: pendingError } = await admin
      .from('event_deposit_transactions')
      .select('amount_usdt, network, status, detected_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed'])
      .order('detected_at', { ascending: false });

    if (pendingError) {
      throw pendingError;
    }

    // Calculate balance breakdown
    const breakdown = {
      total_deposits: 0,
      total_earnings: 0,
      total_withdrawals: 0,
      pending_deposits: 0
    };

    if (transactions) {
      for (const tx of transactions) {
        if (tx.status === 'completed') {
          switch (tx.type) {
            case 'deposit':
              breakdown.total_deposits += Number(tx.amount_usdt);
              break;
            case 'earning':
              breakdown.total_earnings += Number(tx.amount_usdt);
              break;
            case 'withdrawal':
              breakdown.total_withdrawals += Math.abs(Number(tx.amount_usdt));
              break;
          }
        }
      }
    }

    if (pendingDeposits) {
      breakdown.pending_deposits = pendingDeposits.reduce(
        (sum, deposit) => sum + Number(deposit.amount_usdt), 0
      );
    }

    // Get active deposit intents
    const { data: activeIntents, error: intentsError } = await admin
      .from('deposit_intents')
      .select('id, network, amount_usdt, reference_code, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (intentsError) {
      throw intentsError;
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: {
          available_usdt: currentBalance,
          updated_at: balanceData?.updated_at || null
        },
        breakdown,
        pending_deposits: pendingDeposits || [],
        active_intents: activeIntents || [],
        recent_transactions: transactions || []
      }
    });

  } catch (error: any) {
    console.error("Get user balance error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
