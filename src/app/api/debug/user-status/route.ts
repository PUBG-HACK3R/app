import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: authError?.message || "No user found" 
      });
    }

    // Check profile in database
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata
      },
      profile: profile || null,
      profileError: profileError?.message || null,
      isAdmin: profile?.role === 'admin'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Unexpected error" 
    }, { status: 500 });
  }
}
