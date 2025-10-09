import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get all NOWPayments deposits
    const { data: deposits, error: depositsError } = await admin
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (depositsError) {
      return NextResponse.json({ error: depositsError.message }, { status: 500 });
    }

    // Get related transactions for these deposits
    const depositIds = deposits?.map(d => d.id) || [];
    const { data: transactions, error: transactionsError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("type", "deposit")
      .in("reference_id", depositIds);

    // Analyze the data
    const analysis = {
      totalDeposits: deposits?.length || 0,
      statusBreakdown: {} as Record<string, number>,
      waitingDeposits: [] as any[],
      completedDeposits: [] as any[],
      transactionCount: transactions?.length || 0,
      depositsWithoutTransactions: [] as any[],
      webhookIssues: [] as any[]
    };

    // Analyze each deposit
    deposits?.forEach(deposit => {
      const status = deposit.status || 'unknown';
      analysis.statusBreakdown[status] = (analysis.statusBreakdown[status] || 0) + 1;

      if (status === 'waiting') {
        analysis.waitingDeposits.push({
          id: deposit.id,
          order_id: deposit.order_id,
          amount: deposit.amount_usdt,
          created_at: deposit.created_at,
          raw: deposit.raw,
          age_hours: Math.round((Date.now() - new Date(deposit.created_at).getTime()) / (1000 * 60 * 60))
        });
      }

      if (['finished', 'confirmed', 'completed', 'succeeded'].includes(status.toLowerCase())) {
        const hasTransaction = transactions?.some(t => t.reference_id === deposit.id);
        if (!hasTransaction) {
          analysis.depositsWithoutTransactions.push({
            id: deposit.id,
            order_id: deposit.order_id,
            status: deposit.status,
            amount: deposit.amount_usdt
          });
        }
        analysis.completedDeposits.push(deposit);
      }

      // Check for webhook issues
      const raw = deposit.raw || {};
      if (!raw.webhook && status !== 'pending') {
        analysis.webhookIssues.push({
          id: deposit.id,
          order_id: deposit.order_id,
          status: deposit.status,
          issue: 'No webhook data received',
          created_at: deposit.created_at
        });
      }
    });

    // Check NOWPayments API status
    let nowpaymentsStatus = null;
    try {
      const baseUrl = process.env.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1";
      const apiKey = process.env.NOWPAYMENTS_API_KEY;
      
      if (apiKey) {
        const statusRes = await fetch(`${baseUrl}/status`, {
          headers: { "x-api-key": apiKey },
        });
        nowpaymentsStatus = {
          status: statusRes.status,
          ok: statusRes.ok,
          data: statusRes.ok ? await statusRes.json() : await statusRes.text()
        };
      }
    } catch (error) {
      nowpaymentsStatus = { error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis,
      deposits: deposits?.slice(0, 10), // First 10 for detailed view
      transactions,
      nowpaymentsStatus,
      recommendations: [
        analysis.waitingDeposits.length > 0 ? "You have deposits stuck in 'waiting' status - check NOWPayments dashboard" : null,
        analysis.depositsWithoutTransactions.length > 0 ? "Some completed deposits don't have transaction records - webhook may have failed" : null,
        analysis.webhookIssues.length > 0 ? "Some deposits are missing webhook data - check webhook URL configuration" : null
      ].filter(Boolean),
      webhookConfig: {
        expectedUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'}/api/nowpayments/webhook`,
        ipnSecretConfigured: !!process.env.NOWPAYMENTS_IPN_SECRET
      }
    });

  } catch (error: any) {
    console.error("Debug deposits error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
