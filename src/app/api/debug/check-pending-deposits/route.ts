import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if deposit_transactions table exists and get data
    let depositTransactionsData = null;
    let depositTransactionsError = null;
    
    try {
      const { data, error } = await admin
        .from("deposit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      depositTransactionsData = data;
      depositTransactionsError = error;
    } catch (error: any) {
      depositTransactionsError = error;
    }

    // Check alternative tables that might contain deposit data
    let eventDepositData = null;
    try {
      const { data } = await admin
        .from("event_deposit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("detected_at", { ascending: false })
        .limit(10);
      eventDepositData = data;
    } catch (error) {
      // Table doesn't exist
    }

    // Check regular transactions for deposits
    const { data: regularDeposits } = await admin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "deposit")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      deposit_transactions_table: {
        exists: !depositTransactionsError || depositTransactionsError.code !== "42P01",
        data: depositTransactionsData,
        error: depositTransactionsError?.message,
        count: depositTransactionsData?.length || 0
      },
      event_deposit_transactions_table: {
        exists: !!eventDepositData,
        data: eventDepositData,
        count: eventDepositData?.length || 0
      },
      regular_transactions_deposits: {
        data: regularDeposits,
        count: regularDeposits?.length || 0
      },
      summary: {
        total_deposit_sources: [
          depositTransactionsData?.length || 0,
          eventDepositData?.length || 0,
          regularDeposits?.length || 0
        ],
        has_any_deposits: (depositTransactionsData?.length || 0) > 0 || 
                         (eventDepositData?.length || 0) > 0 || 
                         (regularDeposits?.length || 0) > 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
