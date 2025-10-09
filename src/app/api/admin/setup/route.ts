import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated" 
      }, { status: 401 });
    }

    // Use admin client to update role
    const admin = getSupabaseAdminClient();
    
    // Check if user already has admin role
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (existingProfile?.role === 'admin') {
      return NextResponse.json({
        success: true,
        message: "User is already an admin",
        user: {
          id: user.id,
          email: user.email,
          role: existingProfile.role
        }
      });
    }

    // Update user role to admin
    const { data: updatedProfile, error: updateError } = await admin
      .from("user_profiles")
      .update({ role: "admin" })
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Admin setup error:", updateError);
      return NextResponse.json({
        success: false,
        error: `Failed to set admin role: ${updateError.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully granted admin access",
      user: {
        id: user.id,
        email: user.email,
        role: updatedProfile.role
      }
    });

  } catch (error: any) {
    console.error("Admin setup error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
