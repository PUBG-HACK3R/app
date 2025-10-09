import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all plans
    const admin = getSupabaseAdminClient();

    const { data: plans } = await admin
      .from("investment_plans")
      .select("*")
      .order("created_at", { ascending: false });

    // Get investment stats for each plan
    const { data: investments } = await admin
      .from("user_investments")
      .select("plan_id, status, amount_invested");

    // Process plans with stats
    const processedPlans = (plans || []).map(plan => {
      const planInvestments = (investments || []).filter(inv => inv.plan_id === plan.id);
      
      return {
        ...plan,
        stats: {
          total_investments: planInvestments.length,
          active_investments: planInvestments.filter(inv => inv.status === 'active').length,
          total_invested: planInvestments.reduce((sum, inv) => sum + (inv.amount_invested || 0), 0)
        }
      };
    });

    return NextResponse.json({
      plans: processedPlans
    });

  } catch (error) {
    console.error("Plans API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const planData = await request.json();

    // Validate required fields
    if (!planData.name || !planData.min_amount || !planData.daily_roi_percentage || !planData.duration_days) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const { data: newPlan, error } = await admin
      .from("investment_plans")
      .insert({
        name: planData.name,
        description: planData.description,
        min_amount: planData.min_amount,
        max_amount: planData.max_amount,
        daily_roi_percentage: planData.daily_roi_percentage,
        duration_days: planData.duration_days,
        is_active: planData.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      console.error("Plan creation error:", error);
      return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }

    return NextResponse.json({ plan: newPlan });

  } catch (error) {
    console.error("Plan creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
