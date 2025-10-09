import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const result: any = {
      timestamp: new Date().toISOString(),
      auth: {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        authError: authError?.message
      }
    };

    // Test 2: Check if we can access admin client
    try {
      const { data: testQuery, error: testError } = await admin
        .from("transaction_logs")
        .select("count")
        .limit(1);
      
      result.adminAccess = {
        success: !testError,
        error: testError?.message,
        canQueryTransactions: !!testQuery
      };
    } catch (e: any) {
      result.adminAccess = {
        success: false,
        error: e.message
      };
    }

    // Test 3: If user exists, try to get their data
    if (user) {
      try {
        const { data: userTxs, error: txError } = await admin
          .from("transaction_logs")
          .select("type, amount_usdt, created_at")
          .eq("user_id", user.id)
          .limit(5);
        
        result.userTransactions = {
          count: userTxs?.length || 0,
          data: userTxs,
          error: txError?.message
        };
      } catch (e: any) {
        result.userTransactions = {
          error: e.message
        };
      }

      try {
        const { data: userBalance, error: balanceError } = await admin
          .from("user_balances")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        result.userBalance = {
          hasBalance: !!userBalance,
          balance: userBalance?.available_balance,
          error: balanceError?.message
        };
      } catch (e: any) {
        result.userBalance = {
          error: e.message
        };
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({
      error: "Database debug failed",
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
