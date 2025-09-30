import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TopupSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive().min(1, "Minimum top-up is $1"),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if user is admin
    const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";
    if (role !== "admin") return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });

    const body = await request.json();
    const { userId, amount, reason } = TopupSchema.parse(body);

    const admin = getSupabaseAdminClient();

    // Get target user info first
    const { data: targetUser, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !targetUser?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure target user profile exists
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ 
        user_id: userId, 
        email: targetUser.user.email || "", 
        role: "user" 
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Error creating/updating profile:", profileError);
    }

    // Get current balance from balances table
    const { data: currentBalance } = await admin
      .from("balances")
      .select("available_usdt")
      .eq("user_id", userId)
      .maybeSingle();

    const currentAmount = Number(currentBalance?.available_usdt || 0);
    const newAmount = currentAmount + amount;

    // Create a deposit transaction for the top-up
    const { data: txData, error: txError } = await admin.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount_usdt: amount,
      reference_id: null, // Admin top-ups don't have external reference
      meta: { 
        admin_topup: true, 
        reason: reason || "Manual balance adjustment",
        admin_id: user.id,
        timestamp: new Date().toISOString(),
        reference: `admin-topup-${Date.now()}` // Store our reference in meta
      },
    }).select();

    if (txError) {
      console.error("Error creating top-up transaction:", txError);
      return NextResponse.json({ 
        error: "Failed to create transaction", 
        details: txError.message,
        code: txError.code 
      }, { status: 500 });
    }

    // Update or insert balance record
    const { error: balanceError } = await admin
      .from("balances")
      .upsert({ 
        user_id: userId, 
        available_usdt: newAmount 
      }, { onConflict: "user_id" });

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      // Don't fail the request, but log the error
    }

    const userEmail = targetUser.user.email || "Unknown user";

    return NextResponse.json({
      success: true,
      message: `Successfully topped up $${amount.toFixed(2)} for ${userEmail}`,
      details: {
        userId,
        amount,
        reason: reason || "Manual balance adjustment",
        adminId: user.id,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    console.error("Admin top-up error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
