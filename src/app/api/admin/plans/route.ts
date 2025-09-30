import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Fetch all plans (admin only)
export async function GET() {
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

    // Use admin client to fetch all plans (including inactive ones)
    const admin = getSupabaseAdminClient();
    const { data: plans, error } = await admin
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Plans GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new plan (admin only)
export async function POST(request: NextRequest) {
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
    const { name, price_usdt, roi_daily_percent, duration_days, is_active = true } = body;

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

    // Use admin client to create plan
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("plans")
      .insert({
        name,
        price_usdt: parseFloat(price_usdt),
        roi_daily_percent: parseFloat(roi_daily_percent),
        duration_days: parseInt(duration_days),
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating plan:", error);
      return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Plans POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
