import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// PATCH - Toggle plan status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Use the new admin authentication helper
    await requireAdminAuth();

    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: "is_active must be a boolean value" },
        { status: 400 }
      );
    }

    // Use admin client to toggle plan status
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("investment_plans")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling plan status:", error);
      return NextResponse.json({ error: "Failed to toggle plan status" }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      plan,
      message: `Plan ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Plans toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
