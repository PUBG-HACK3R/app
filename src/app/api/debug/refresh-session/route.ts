import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated" 
      }, { status: 401 });
    }

    // Refresh the session
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      return NextResponse.json({ 
        error: "Failed to refresh session",
        details: refreshError.message 
      }, { status: 500 });
    }

    // Get updated profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: "Session refreshed successfully",
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'user'
      },
      session: {
        refreshed: !!data.session,
        accessToken: data.session?.access_token ? 'present' : 'missing'
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Failed to refresh session", 
      details: err.message 
    }, { status: 500 });
  }
}
