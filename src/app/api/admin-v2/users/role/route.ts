import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
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
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Update user role
    const { error: updateError } = await admin
      .from("user_profiles")
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Role update error:", updateError);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    // Log the role change
    await admin
      .from("transaction_logs")
      .insert({
        user_id: userId,
        type: "deposit", // Using deposit type as there's no role_change type
        amount_usdt: 0,
        description: `Role changed to ${role} by admin`,
        balance_before: 0,
        balance_after: 0
      });

    return NextResponse.json({ 
      success: true,
      message: `User role updated to ${role}`
    });

  } catch (error: any) {
    console.error("Role change error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
