import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// PUT - Update plan (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, price_usdt, roi_daily_percent, duration_days, is_active } = body;

    // Validate required fields
    if (!name || !price_usdt || !roi_daily_percent || !duration_days) {
      return NextResponse.json(
        { error: "Missing required fields: name, price_usdt, roi_daily_percent, duration_days" },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (price_usdt <= 0 || roi_daily_percent <= 0 || duration_days <= 0) {
      return NextResponse.json(
        { error: "Price, ROI, and duration must be positive numbers" },
        { status: 400 }
      );
    }

    // Use admin client to update plan
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("plans")
      .update({
        name,
        price_usdt: parseFloat(price_usdt),
        roi_daily_percent: parseFloat(roi_daily_percent),
        duration_days: parseInt(duration_days),
        is_active: is_active !== undefined ? is_active : true,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating plan:", error);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Use admin client to check if plan has active subscriptions
    const admin = getSupabaseAdminClient();
    const { count: activeSubscriptions } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", params.id)
      .eq("active", true);

    if (activeSubscriptions && activeSubscriptions > 0) {
      return NextResponse.json(
        { error: "Cannot delete plan with active subscriptions. Deactivate the plan instead." },
        { status: 400 }
      );
    }

    // Delete the plan
    const { error } = await admin
      .from("plans")
      .delete()
      .eq("id", params.id);

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
