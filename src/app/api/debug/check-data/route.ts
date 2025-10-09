import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check balances table
    const { data: balanceData, error: balanceError } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Check transactions table
    const { data: transactionData, error: transactionError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Check deposit_transactions table
    const { data: depositTxData, error: depositTxError } = await admin
      .from("deposit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Check deposits table (NOWPayments)
    const { data: depositsData, error: depositsError } = await admin
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Check subscriptions
    const { data: subscriptionsData, error: subscriptionsError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      balances: {
        data: balanceData,
        error: balanceError?.message
      },
      transactions: {
        data: transactionData,
        count: transactionData?.length || 0,
        error: transactionError?.message
      },
      deposit_transactions: {
        data: depositTxData,
        count: depositTxData?.length || 0,
        error: depositTxError?.message
      },
      deposits: {
        data: depositsData,
        count: depositsData?.length || 0,
        error: depositsError?.message
      },
      subscriptions: {
        data: subscriptionsData,
        count: subscriptionsData?.length || 0,
        error: subscriptionsError?.message
      }
    });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
