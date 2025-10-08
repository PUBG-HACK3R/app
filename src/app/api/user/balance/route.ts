import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/database/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Get user balance using clean database service
    const balance = await db.getUserBalance(user.id);
    
    if (!balance) {
      return NextResponse.json({ 
        success: false,
        error: "Balance not found" 
      }, { status: 404 });
    }

    // Get active investments
    const investments = await db.getUserInvestments(user.id);
    const activeInvestments = investments.filter(inv => inv.status === 'active');

    return NextResponse.json({
      success: true,
      balance: {
        available: balance.available_balance,
        locked: balance.locked_balance,
        total_deposited: balance.total_deposited,
        total_withdrawn: balance.total_withdrawn,
        total_earned: balance.total_earned
      },
      has_active_investments: activeInvestments.length > 0,
      active_investments_count: activeInvestments.length,
      user_id: user.id
    });

  } catch (error) {
    console.error("User balance API error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 });
  }
}
