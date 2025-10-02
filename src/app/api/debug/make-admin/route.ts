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
        error: "Not authenticated" 
      }, { status: 401 });
    }

    // Use admin client to update role
    const admin = getSupabaseAdminClient();
    
    // Update profile role
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("user_id", user.id);

    if (profileError) {
      return NextResponse.json({ 
        error: "Failed to update profile role",
        details: profileError.message 
      }, { status: 500 });
    }

    // Also update auth metadata
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(
      user.id,
      { 
        user_metadata: { 
          ...user.user_metadata,
          role: "admin" 
        } 
      }
    );

    if (authUpdateError) {
      console.warn("Failed to update auth metadata:", authUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully set user as admin",
      user: {
        id: user.id,
        email: user.email,
        role: "admin"
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Failed to make admin", 
      details: err.message 
    }, { status: 500 });
  }
}
