import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Fetch all plans (admin only)
export async function GET() {
  try {
    // Use standardized auth helper
    await requireAdminAuth();

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
    // Use standardized auth helper
    await requireAdminAuth();

    const body = await request.json();
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
      is_active = true 
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

    // Use admin client to create plan
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("plans")
      .insert({
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
