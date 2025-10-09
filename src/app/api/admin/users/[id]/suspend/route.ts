import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// PATCH - Toggle user suspension status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Require admin authentication
    await requireAdminAuth();

    const body = await request.json();
    const { is_suspended } = body;

    if (typeof is_suspended !== 'boolean') {
      return NextResponse.json(
        { error: "is_suspended must be a boolean value" },
        { status: 400 }
      );
    }

    // Use admin client to update user suspension status
    const admin = getSupabaseAdminClient();
    
    // Update the user's profile
    const { data: profile, error } = await admin
      .from("user_profiles")
      .update({ is_suspended })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user suspension status:", error);
      return NextResponse.json({ 
        error: "Failed to update user suspension status", 
        details: error.message 
      }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      profile,
      message: `User ${is_suspended ? 'suspended' : 'unsuspended'} successfully`
    });
  } catch (error) {
    console.error("User suspension error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
