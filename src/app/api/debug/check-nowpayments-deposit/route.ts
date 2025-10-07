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

    // Check the deposits table (where NOWPayments webhook stores data)
    let depositsTableData = null;
    let depositsTableError = null;
    
    try {
      const { data, error } = await admin
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      depositsTableData = data;
      depositsTableError = error;
    } catch (error: any) {
      depositsTableError = error;
    }

    // Check for any deposits with your payment ID
    let paymentIdSearch = null;
    try {
      const { data } = await admin
        .from("deposits")
        .select("*")
        .or(`order_id.ilike.%4788991001%,order_id.ilike.%6112761797%`)
        .order("created_at", { ascending: false })
        .limit(5);
      paymentIdSearch = data;
    } catch (error) {
      // Ignore
    }

    // Check all deposits (not filtered by user) to see if payment exists
    let allDeposits = null;
    try {
      const { data } = await admin
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      allDeposits = data;
    } catch (error) {
      // Ignore
    }

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      payment_info: {
        nowpayments_iid: "4788991001",
        payment_id: "6112761797",
        payment_url: "https://nowpayments.io/payment?iid=4788991001&paymentId=6112761797"
      },
      deposits_table: {
        exists: !depositsTableError || depositsTableError.code !== "42P01",
        user_deposits: depositsTableData,
        user_deposits_count: depositsTableData?.length || 0,
        error: depositsTableError?.message
      },
      payment_id_search: {
        data: paymentIdSearch,
        count: paymentIdSearch?.length || 0
      },
      all_recent_deposits: {
        data: allDeposits,
        count: allDeposits?.length || 0
      },
      analysis: {
        has_user_deposits: (depositsTableData?.length || 0) > 0,
        payment_found_by_id: (paymentIdSearch?.length || 0) > 0,
        total_deposits_in_system: allDeposits?.length || 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
