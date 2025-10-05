import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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

    // Force set admin role using admin client
    const adminClient = getSupabaseAdminClient();
    
    // First, try to update existing profile
    const { data: updateResult, error: updateError } = await adminClient
      .from("profiles")
      .update({ role: 'admin' })
      .eq("user_id", user.id)
      .select();

    // If no rows updated, create the profile
    if (!updateResult || updateResult.length === 0) {
      const { data: insertResult, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          user_id: user.id,
          email: user.email,
          role: 'admin',
          balance_usdt: 0
        })
        .select();

      if (insertError) {
        return NextResponse.json({
          error: "Failed to create admin profile",
          insertError: (insertError as any)?.message || 'Unknown error'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Admin profile created",
        profile: insertResult[0]
      });
    }

    if (updateError) {
      return NextResponse.json({
        error: "Failed to update admin role",
        updateError: (updateError as any)?.message || 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin role set successfully",
      profile: updateResult[0]
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
