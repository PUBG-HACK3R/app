import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SetRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "admin"]),
  adminSecret: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, adminSecret } = SetRoleSchema.parse(body);
    
    // Check admin secret (you can set this in your .env.local)
    const expectedSecret = process.env.ADMIN_SECRET || "admin123";
    if (adminSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid admin secret" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();
    
    // Update user metadata with admin role
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role }
    });

    if (error) {
      console.error("Error setting user role:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also update the profiles table
    await admin
      .from("user_profiles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id" });

    return NextResponse.json({ 
      success: true, 
      message: `User role updated to ${role}`,
      user: data.user 
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    console.error("Set role error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
