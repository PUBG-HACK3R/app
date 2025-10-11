import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get all investment plans
    const { data: plans, error: plansError } = await admin
      .from("investment_plans")
      .select("*")
      .order("duration_days", { ascending: true });

    if (plansError) {
      return NextResponse.json({ 
        error: "Failed to fetch plans", 
        details: plansError.message 
      }, { status: 500 });
    }

    // Get user's investments to see what's actually stored
    const { data: userInvestments, error: investmentError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    return NextResponse.json({
      success: true,
      plans: plans?.map(plan => ({
        id: plan.id,
        name: plan.name,
        duration_days: plan.duration_days,
        daily_roi_percentage: plan.daily_roi_percentage,
        min_amount: plan.min_amount,
        max_amount: plan.max_amount,
        is_active: plan.is_active,
        // Calculate what the rates should be
        calculated_total_rate: plan.daily_roi_percentage * plan.duration_days,
        payout_type: plan.duration_days >= 30 ? 'end' : 'daily',
        issue: plan.daily_roi_percentage >= 50 ? 'DAILY_ROI_TOO_HIGH' : 'OK'
      })),
      user_investments: userInvestments?.map(inv => ({
        id: inv.id,
        plan_id: inv.plan_id,
        amount_invested: inv.amount_invested,
        daily_roi_percentage: inv.daily_roi_percentage,
        duration_days: inv.duration_days,
        total_earned: inv.total_earned,
        calculated_total_rate: inv.daily_roi_percentage * inv.duration_days,
        issue: inv.daily_roi_percentage >= 50 ? 'DAILY_ROI_TOO_HIGH' : 'OK'
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Plans check error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
