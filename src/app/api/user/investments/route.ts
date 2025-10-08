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

    // Get user investments using clean database service
    const investments = await db.getUserInvestments(user.id);
    
    return NextResponse.json({
      success: true,
      investments: investments.map(investment => ({
        id: investment.id,
        plan_id: investment.plan_id,
        amount_invested: investment.amount_invested,
        daily_roi_percentage: investment.daily_roi_percentage,
        duration_days: investment.duration_days,
        start_date: investment.start_date,
        end_date: investment.end_date,
        status: investment.status,
        total_earned: investment.total_earned,
        last_earning_date: investment.last_earning_date,
        created_at: investment.created_at,
        // Calculate progress
        days_remaining: investment.status === 'active' ? 
          Math.max(0, Math.ceil((new Date(investment.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
        progress_percentage: investment.status === 'completed' ? 100 :
          Math.min(100, Math.max(0, ((new Date().getTime() - new Date(investment.start_date).getTime()) / 
          (new Date(investment.end_date).getTime() - new Date(investment.start_date).getTime())) * 100))
      })),
      summary: {
        total_investments: investments.length,
        active_investments: investments.filter(inv => inv.status === 'active').length,
        completed_investments: investments.filter(inv => inv.status === 'completed').length,
        total_invested: investments.reduce((sum, inv) => sum + inv.amount_invested, 0),
        total_earned: investments.reduce((sum, inv) => sum + inv.total_earned, 0)
      }
    });

  } catch (error) {
    console.error("User investments API error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 });
  }
}
