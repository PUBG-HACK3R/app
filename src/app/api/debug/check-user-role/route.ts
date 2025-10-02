import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated",
        authenticated: false 
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: "Failed to fetch profile",
        details: profileError.message,
        user: {
          id: user.id,
          email: user.email
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'none',
        profile: profile
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Check failed", 
      details: err.message 
    }, { status: 500 });
  }
}
