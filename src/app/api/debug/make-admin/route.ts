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
    
    // First check current profile
    const { data: currentProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("Current profile before update:", currentProfile);

    // Update profile role with upsert to ensure it exists
    const { data: updatedProfile, error: profileError } = await admin
      .from("profiles")
      .upsert({ 
        user_id: user.id,
        email: user.email,
        role: "admin" 
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json({ 
        error: "Failed to update profile role",
        details: profileError.message 
      }, { status: 500 });
    }

    console.log("Updated profile:", updatedProfile);

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

    // Verify the update worked
    const { data: verifyProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("Verified profile after update:", verifyProfile);

    return NextResponse.json({
      success: true,
      message: "Successfully set user as admin",
      user: {
        id: user.id,
        email: user.email,
        role: verifyProfile?.role || "admin"
      },
      debug: {
        beforeUpdate: currentProfile,
        afterUpdate: updatedProfile,
        verified: verifyProfile
      }
    });

  } catch (err: any) {
    console.error("Make admin error:", err);
    return NextResponse.json({ 
      error: "Failed to make admin", 
      details: err.message 
    }, { status: 500 });
  }
}
