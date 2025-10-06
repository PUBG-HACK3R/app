import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const network = searchParams.get('network');

    // Build query for deposit transactions
    let query = admin
      .from('event_deposit_transactions')
      .select(`
        id,
        tx_hash,
        from_address,
        to_address,
        amount_usdt,
        network,
        block_number,
        confirmations,
        status,
        detected_at,
        confirmed_at,
        credited_at,
        reference_code,
        deposit_intent_id
      `)
      .eq('user_id', userId)
      .order('detected_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (network) {
      query = query.eq('network', network);
    }

    const { data: deposits, error: depositsError } = await query
      .range(offset, offset + limit - 1);

    if (depositsError) {
      throw depositsError;
    }

    // Get deposit intents
    let intentQuery = admin
      .from('deposit_intents')
      .select(`
        id,
        network,
        amount_usdt,
        reference_code,
        main_wallet_address,
        status,
        expires_at,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (network) {
      intentQuery = intentQuery.eq('network', network);
    }

    const { data: intents, error: intentsError } = await intentQuery
      .range(0, 49); // Get recent intents

    if (intentsError) {
      throw intentsError;
    }

    // Get total counts
    const { count: totalDeposits } = await admin
      .from('event_deposit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalIntents } = await admin
      .from('deposit_intents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Calculate summary statistics
    const { data: summaryData } = await admin
      .from('event_deposit_transactions')
      .select('amount_usdt, status, network')
      .eq('user_id', userId);

    const summary = {
      total_deposits: summaryData?.length || 0,
      total_amount: summaryData?.reduce((sum, tx) => sum + Number(tx.amount_usdt), 0) || 0,
      credited_amount: summaryData?.filter(tx => tx.status === 'credited')
        .reduce((sum, tx) => sum + Number(tx.amount_usdt), 0) || 0,
      pending_amount: summaryData?.filter(tx => tx.status === 'pending')
        .reduce((sum, tx) => sum + Number(tx.amount_usdt), 0) || 0,
      by_network: {
        TRC20: {
          count: summaryData?.filter(tx => tx.network === 'TRC20').length || 0,
          amount: summaryData?.filter(tx => tx.network === 'TRC20')
            .reduce((sum, tx) => sum + Number(tx.amount_usdt), 0) || 0
        },
        BEP20: {
          count: summaryData?.filter(tx => tx.network === 'BEP20').length || 0,
          amount: summaryData?.filter(tx => tx.network === 'BEP20')
            .reduce((sum, tx) => sum + Number(tx.amount_usdt), 0) || 0
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        deposits: deposits || [],
        intents: intents || [],
        summary,
        pagination: {
          limit,
          offset,
          total: totalDeposits || 0,
          has_more: (offset + limit) < (totalDeposits || 0)
        }
      }
    });

  } catch (error: any) {
    console.error("Get user deposits error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
