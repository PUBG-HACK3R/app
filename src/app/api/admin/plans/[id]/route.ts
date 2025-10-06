import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// PUT - Update plan (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Use the new admin authentication helper
    console.log('Authenticating admin for plan update...');
    await requireAdminAuth();
    console.log('Admin authentication successful');

    const body = await request.json();
    console.log('Request body:', body);
    const { 
      name, 
      description,
      min_amount, 
      roi_daily_percent, 
      duration_days,
      category_id,
      mining_type,
      hash_rate,
      power_consumption,
      risk_level,
      features,
      is_active 
    } = body;

    // Validate required fields
    if (!name || !min_amount || !roi_daily_percent || !duration_days) {
      return NextResponse.json(
        { error: "Missing required fields: name, min_amount, roi_daily_percent, duration_days" },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (min_amount <= 0 || roi_daily_percent <= 0 || duration_days <= 0) {
      return NextResponse.json(
        { error: "Amount, ROI, and duration must be positive numbers" },
        { status: 400 }
      );
    }

    // Use admin client to update plan
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("plans")
      .update({
        name,
        description: description || '',
        min_amount: parseFloat(min_amount),
        roi_daily_percent: parseFloat(roi_daily_percent),
        duration_days: parseInt(duration_days),
        category_id: category_id || null,
        mining_type: mining_type || 'ASIC Mining',
        hash_rate: hash_rate || '0 TH/s',
        power_consumption: power_consumption || '0W',
        risk_level: risk_level || 'Medium',
        features: JSON.stringify(features || []),
        is_active: is_active !== undefined ? is_active : true,
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
    // Use the new admin authentication helper
    await requireAdminAuth();

    // Use admin client to check if plan has active subscriptions
    const admin = getSupabaseAdminClient();
    const { count: activeSubscriptions } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("active", true);

    if (activeSubscriptions && activeSubscriptions > 0) {
      return NextResponse.json(
        { error: "Cannot delete plan with active subscriptions. Deactivate the plan instead." },
        { status: 400 }
      );
    }

    // Delete the plan
    const { data: plan, error: fetchError } = await admin
      .from("plans")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching plan:", fetchError);
      return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
    }

    const { error } = await admin
      .from("plans")
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
