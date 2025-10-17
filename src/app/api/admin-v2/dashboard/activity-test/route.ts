import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    console.log("🧪 Testing activity data sources...");
    
    const admin = getSupabaseAdminClient();

    // Test each data source individually
    const results = {
      transaction_logs: { count: 0, error: null as string | null, sample: null as any },
      deposits: { count: 0, error: null as string | null, sample: null as any },
      withdrawals: { count: 0, error: null as string | null, sample: null as any },
      user_profiles: { count: 0, error: null as string | null, sample: null as any }
    };

    // Test transaction_logs
    try {
      const { data: transactions, error } = await admin
        .from("transaction_logs")
        .select("id, type, amount_usdt, created_at, user_id, status, description")
        .order("created_at", { ascending: false })
        .limit(5);
      
      results.transaction_logs.count = transactions?.length || 0;
      results.transaction_logs.error = error?.message || null;
      results.transaction_logs.sample = transactions?.[0] || null;
    } catch (err: any) {
      results.transaction_logs.error = err.message;
    }

    // Test deposits
    try {
      const { data: deposits, error } = await admin
        .from("deposits")
        .select("id, user_id, amount_usdt, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      
      results.deposits.count = deposits?.length || 0;
      results.deposits.error = error?.message || null;
      results.deposits.sample = deposits?.[0] || null;
    } catch (err: any) {
      results.deposits.error = err.message;
    }

    // Test withdrawals
    try {
      const { data: withdrawals, error } = await admin
        .from("withdrawals")
        .select("id, user_id, amount_usdt, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      
      results.withdrawals.count = withdrawals?.length || 0;
      results.withdrawals.error = error?.message || null;
      results.withdrawals.sample = withdrawals?.[0] || null;
    } catch (err: any) {
      results.withdrawals.error = err.message;
    }

    // Test user_profiles
    try {
      const { data: profiles, error } = await admin
        .from("user_profiles")
        .select("user_id, email")
        .limit(3);
      
      results.user_profiles.count = profiles?.length || 0;
      results.user_profiles.error = error?.message || null;
    } catch (err: any) {
      results.user_profiles.error = err.message;
    }

    console.log("🧪 Test results:", results);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error("🧪 Test failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
