import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated", 
        details: authError 
      }, { status: 401 });
    }

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await admin
      .from("user_investments")
      .select(`
        id,
        plan_id,
        created_at,
        is_active,
        duration_days,
        plans (
          id,
          name,
          min_amount,
          daily_roi_percentage
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (subError) {
      return NextResponse.json({ 
        error: "Failed to fetch subscriptions", 
        details: subError 
      }, { status: 500 });
    }

    // Get user's transactions for these subscriptions
    const transactionPromises = (subscriptions || []).map(async (sub) => {
      const { data: transactions } = await admin
        .from("transaction_logs")
        .select("*")
        .eq("user_id", user.id)
        .ilike("description", `%${sub.id}%`)
        .order("created_at", { ascending: false });
      
      return {
        subscription_id: sub.id,
        transactions: transactions || []
      };
    });

    const transactionResults = await Promise.all(transactionPromises);

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      subscriptions: subscriptions || [],
      subscription_count: subscriptions?.length || 0,
      active_subscriptions: subscriptions?.filter(s => s.is_active) || [],
      transactions_by_subscription: transactionResults,
      debug_info: {
        timestamp: new Date().toISOString(),
        query_used: "subscriptions with plans join, filtered by user_id and ordered by created_at desc"
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug check failed",
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
