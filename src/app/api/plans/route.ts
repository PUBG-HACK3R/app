import { NextResponse } from "next/server";
import { db } from "@/lib/database/service";

// GET - Fetch active investment plans (public endpoint)
export async function GET() {
  try {
    const plans = await db.getActivePlans();
    
    return NextResponse.json({ 
      success: true,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        min_amount: plan.min_amount,
        max_amount: plan.max_amount,
        daily_roi_percentage: plan.daily_roi_percentage,
        duration_days: plan.duration_days,
        is_active: plan.is_active
      }))
    });
  } catch (error) {
    console.error("Plans GET error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch investment plans" 
    }, { status: 500 });
  }
}
