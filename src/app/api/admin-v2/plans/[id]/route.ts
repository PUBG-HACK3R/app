import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// PUT - Update plan (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const body = await request.json();
    console.log('Admin-v2 Plan Update - Request body:', body);
    
    const { 
      name, 
      description,
      min_amount,
      max_amount,
      daily_roi_percentage, 
      duration_days,
      is_active 
    } = body;

    // Validate required fields
    if (!name || !min_amount || !daily_roi_percentage || !duration_days) {
      return NextResponse.json(
        { error: "Missing required fields: name, min_amount, daily_roi_percentage, duration_days" },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (min_amount <= 0 || daily_roi_percentage <= 0 || duration_days <= 0) {
      return NextResponse.json(
        { error: "Amount, ROI, and duration must be positive numbers" },
        { status: 400 }
      );
    }

    // Use admin client to update plan
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("investment_plans")
      .update({
        name,
        description: description || '',
        min_amount: parseFloat(min_amount),
        max_amount: parseFloat(max_amount || min_amount),
        daily_roi_percentage: parseFloat(daily_roi_percentage),
        duration_days: parseInt(duration_days),
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating plan:", error);
      return NextResponse.json({ 
        error: "Failed to update plan", 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plans PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete plan (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Use admin client to check if plan has active investments
    const admin = getSupabaseAdminClient();
    const { count: activeInvestments } = await admin
      .from("user_investments")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("status", "active");

    if (activeInvestments && activeInvestments > 0) {
      return NextResponse.json(
        { error: "Cannot delete plan with active investments. Deactivate the plan instead." },
        { status: 400 }
      );
    }

    // Delete the plan
    const { data: plan, error: fetchError } = await admin
      .from("investment_plans")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching plan:", fetchError);
      return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
    }

    const { error } = await admin
      .from("investment_plans")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting plan:", error);
      return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }

    return NextResponse.json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Plans DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
