import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get current user
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        error: "Not authenticated",
        authError: authError?.message
      }, { status: 401 });
    }

    // Check profile using admin client
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Also check if profile exists at all
    const { data: allProfiles, error: allProfilesError } = await adminClient
      .from("profiles")
      .select("user_id, email, role")
      .limit(5);

    return NextResponse.json({
      success: true,
      currentUser: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError?.message,
      isAdmin: profile?.role === 'admin',
      allProfiles: allProfiles,
      allProfilesError: allProfilesError?.message,
      debug: {
        userIdMatch: allProfiles?.find(p => p.user_id === user.id),
        totalProfiles: allProfiles?.length
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
