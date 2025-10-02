import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET endpoint so you can visit it directly in browser
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated - please log in first" 
      }, { status: 401 });
    }

    // Use admin client to force update role
    const admin = getSupabaseAdminClient();
    
    // Force update with raw SQL to bypass any issues
    const { data: updateResult, error: updateError } = await admin
      .rpc('force_admin_role', { target_user_id: user.id });

    // If RPC doesn't exist, use direct update
    if (updateError && updateError.message.includes('function')) {
      const { error: directUpdateError } = await admin
        .from("profiles")
        .update({ role: "admin" })
        .eq("user_id", user.id);

      if (directUpdateError) {
        return NextResponse.json({ 
          error: "Failed to update role directly",
          details: directUpdateError.message 
        }, { status: 500 });
      }
    } else if (updateError) {
      return NextResponse.json({ 
        error: "Failed to update role via RPC",
        details: updateError.message 
      }, { status: 500 });
    }

    // Verify the update
    const { data: verifyProfile } = await admin
      .from("profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    // Also check with user client
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: "Admin role force updated!",
      user: {
        id: user.id,
        email: user.email
      },
      verification: {
        adminClient: verifyProfile,
        userClient: userProfile,
        rolesMatch: verifyProfile?.role === userProfile?.role
      },
      instructions: "Now try the 'Process Daily Earnings' button in the admin panel"
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Failed to force admin role", 
      details: err.message 
    }, { status: 500 });
  }
}
