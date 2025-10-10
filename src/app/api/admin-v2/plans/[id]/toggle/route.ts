import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// PUT - Toggle plan status (admin only)
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
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: "is_active must be a boolean value" },
        { status: 400 }
      );
    }

    // Use admin client to update plan status
    const admin = getSupabaseAdminClient();
    const { data: plan, error } = await admin
      .from("investment_plans")
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling plan status:", error);
      return NextResponse.json({ 
        error: "Failed to toggle plan status", 
        details: error.message 
      }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      plan,
      message: `Plan ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Plan toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
