import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get all plans to see current order (matching the service.ts ordering)
    const { data: plans, error } = await admin
      .from("investment_plans")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Current plans order (by name ascending)",
      plans: plans?.map(plan => ({
        name: plan.name,
        min_amount: plan.min_amount,
        max_amount: plan.max_amount,
        duration_days: plan.duration_days,
        daily_roi_percentage: plan.daily_roi_percentage
      })) || []
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: "Failed to fetch plans",
      details: error.message 
    }, { status: 500 });
  }
}
