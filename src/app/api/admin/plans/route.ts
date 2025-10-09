import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreatePlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  min_amount: z.number().positive("Minimum amount must be positive"),
  max_amount: z.number().positive("Maximum amount must be positive"),
  daily_roi_percentage: z.number().positive("Daily ROI must be positive"),
  duration_days: z.number().int().positive("Duration must be positive"),
  is_active: z.boolean().default(true)
});

const UpdatePlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  min_amount: z.number().positive().optional(),
  max_amount: z.number().positive().optional(),
  daily_roi_percentage: z.number().positive().optional(),
  duration_days: z.number().int().positive().optional(),
  is_active: z.boolean().optional()
});

// GET - Fetch all plans (admin only)
export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const token = request.headers.get('cookie')?.split('admin_token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: "Admin authentication required" 
      }, { status: 401 });
    }

    const adminUser = await adminAuth.verifyToken(token);
    if (!adminUser) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid admin token" 
      }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    
    // Get all plans with investment statistics
    const { data: plans, error } = await supabase
      .from("investment_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json({ 
        success: false,
        error: "Failed to fetch plans" 
      }, { status: 500 });
    }

    // Get investment statistics for each plan
    const { data: investments } = await supabase
      .from('user_investments')
      .select('plan_id, status, amount_invested, total_earned');

    // Add statistics to each plan
    const plansWithStats = (plans || []).map(plan => {
      const planInvestments = (investments || []).filter(inv => inv.plan_id === plan.id);
      
      return {
        ...plan,
        stats: {
          total_investments: planInvestments.length,
          active_investments: planInvestments.filter(inv => inv.status === 'active').length,
          completed_investments: planInvestments.filter(inv => inv.status === 'completed').length,
          locked_balance: planInvestments.reduce((sum, inv) => sum + Number(inv.amount_invested || 0), 0),
          total_earned: planInvestments.reduce((sum, inv) => sum + Number(inv.total_earned || 0), 0)
        }
      };
    });

    return NextResponse.json({ 
      success: true,
      plans: plansWithStats 
    });
  } catch (error) {
    console.error("Plans GET error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// POST - Create new plan (admin only)
export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const token = request.headers.get('cookie')?.split('admin_token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: "Admin authentication required" 
      }, { status: 401 });
    }

    const adminUser = await adminAuth.verifyToken(token);
    if (!adminUser) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid admin token" 
      }, { status: 401 });
    }

    const json = await request.json();
    const planData = CreatePlanSchema.parse(json);

    // Validate max_amount >= min_amount
    if (planData.max_amount < planData.min_amount) {
      return NextResponse.json({ 
        success: false,
        error: "Maximum amount must be greater than or equal to minimum amount" 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: newPlan, error } = await supabase
      .from("investment_plans")
      .insert(planData)
      .select()
      .single();

    if (error) {
      console.error("Error creating plan:", error);
      return NextResponse.json({ 
        success: false,
        error: "Failed to create plan" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      plan: newPlan,
      message: "Plan created successfully" 
    });

  } catch (err: any) {
    console.error("Plan creation error:", err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid plan data", 
        issues: err.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Failed to create plan" 
    }, { status: 500 });
  }
}
