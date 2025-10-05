import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated. Please login first." 
      }, { status: 401 });
    }

    // Use admin client to set role
    const adminClient = getSupabaseAdminClient();
    
    // First, ensure profile exists
    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: user.id,
        email: user.email || '',
        role: 'admin'
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error("Error setting admin role:", upsertError);
      return NextResponse.json({ 
        error: "Failed to set admin role",
        details: upsertError.message 
      }, { status: 500 });
    }

    // Verify the change
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: "Successfully granted admin access!",
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role
      }
    });
  } catch (error: any) {
    console.error("Become admin error:", error);
    return NextResponse.json({ 
      error: error.message || "Unexpected error" 
    }, { status: 500 });
  }
}
