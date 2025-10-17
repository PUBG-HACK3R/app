import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    console.log("🧪 Simple Activity API called");
    
    const admin = getSupabaseAdminClient();
    
    // Get recent activities from multiple sources
    const activities: any[] = [];

    // Get deposits
    const { data: deposits, error: depError } = await admin
      .from("deposits")
      .select("id, user_id, amount_usdt, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!depError && deposits) {
      deposits.forEach(d => {
        activities.push({
          id: `dep_${d.id}`,
          type: 'deposit',
          amount: d.amount_usdt || 0,
          user_email: 'User',
          created_at: d.created_at,
          status: d.status || 'completed'
        });
      });
    }

    // Get withdrawals
    const { data: withdrawals, error: withError } = await admin
      .from("withdrawals")
      .select("id, user_id, amount_usdt, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!withError && withdrawals) {
      withdrawals.forEach(w => {
        activities.push({
          id: `with_${w.id}`,
          type: 'withdrawal',
          amount: w.amount_usdt || 0,
          user_email: 'User',
          created_at: w.created_at,
          status: w.status || 'pending'
        });
      });
    }

    // Get transaction logs
    const { data: transactions, error: transError } = await admin
      .from("transaction_logs")
      .select("id, type, amount_usdt, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!transError && transactions) {
      transactions.forEach(t => {
        activities.push({
          id: `trans_${t.id}`,
          type: t.type || 'transaction',
          amount: t.amount_usdt || 0,
          user_email: 'User',
          created_at: t.created_at,
          status: t.status || 'completed'
        });
      });
    }

    // Sort by date and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    console.log(`🧪 Simple API returning ${sortedActivities.length} activities`);
    console.log(`🧪 Activity types: ${[...new Set(sortedActivities.map(a => a.type))]}`);

    return NextResponse.json({
      activities: sortedActivities
    });

  } catch (error: any) {
    console.error("🧪 Simple Activity API error:", error);
    return NextResponse.json({ 
      error: error.message,
      activities: []
    }, { status: 500 });
  }
}
