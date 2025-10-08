import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/database/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InvestmentSchema = z.object({
  plan_id: z.string().uuid("Invalid plan ID"),
  amount: z.number().positive("Amount must be positive"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { plan_id, amount } = InvestmentSchema.parse(json);

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

    // Validate plan exists and is active
    const plan = await db.getPlanById(plan_id);
    if (!plan || !plan.is_active) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid or inactive investment plan" 
      }, { status: 400 });
    }

    // Validate amount is within plan limits
    if (amount < plan.min_amount || amount > plan.max_amount) {
      return NextResponse.json({ 
        success: false,
        error: `Investment amount must be between $${plan.min_amount} and $${plan.max_amount}` 
      }, { status: 400 });
    }

    // Check user balance
    const balance = await db.getUserBalance(user.id);
    if (!balance || balance.available_balance < amount) {
      return NextResponse.json({ 
        success: false,
        error: `Insufficient balance. Available: $${balance?.available_balance.toFixed(2) || '0.00'}` 
      }, { status: 400 });
    }

    // Create investment
    const investment = await db.createInvestment(user.id, plan_id, amount);
    
    if (!investment) {
      return NextResponse.json({ 
        success: false,
        error: "Failed to create investment" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      investment: {
        id: investment.id,
        plan_name: plan.name,
        amount_invested: investment.amount_invested,
        daily_roi_percentage: investment.daily_roi_percentage,
        duration_days: investment.duration_days,
        start_date: investment.start_date,
        end_date: investment.end_date,
        status: investment.status,
        total_earned: investment.total_earned,
        created_at: investment.created_at
      }
    });

  } catch (err: any) {
    console.error("Investment creation error:", err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid request data", 
        issues: err.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: err.message || "Failed to create investment" 
    }, { status: 500 });
  }
}
