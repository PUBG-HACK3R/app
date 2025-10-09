import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated",
        user: null
      });
    }

    // Check role using admin client
    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Also check user metadata
    const userMetadata = {
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata
    };

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile,
      profile_error: profileError,
      user_metadata: userMetadata,
      is_admin_by_profile: profile?.role === 'admin',
      is_admin_by_metadata: (user.app_metadata as any)?.role === 'admin' || (user.user_metadata as any)?.role === 'admin'
    });

  } catch (error: any) {
    console.error("Admin role check error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
