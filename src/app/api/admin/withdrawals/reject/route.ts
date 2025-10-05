import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Rejection reason is required"),
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check admin role directly using admin client (same method as admin page)
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: adminCheckError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (adminCheckError || !profile || profile.role !== 'admin') {
      console.log("Reject withdrawal API - Profile error or not admin:", adminCheckError, profile?.role);
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { id, reason } = RejectSchema.parse(body);

    const admin = getSupabaseAdminClient();

    // Fetch withdrawal
    const { data: wd, error: wdErr } = await admin
      .from("withdrawals")
      .select("id,user_id,amount_usdt,status")
      .eq("id", id)
      .single();
    if (wdErr || !wd) return NextResponse.json({ error: wdErr?.message || "Withdrawal not found" }, { status: 404 });
    if (wd.status !== "pending") return NextResponse.json({ error: "Withdrawal is not pending" }, { status: 400 });

    // Reject withdrawal (only update status - other columns don't exist)
    const { error: updErr } = await admin
      .from("withdrawals")
      .update({ status: "rejected" })
      .eq("id", wd.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    // Log the rejection reason in a transaction record for audit trail
    const description = `Withdrawal rejected by admin ${user.id}: ${reason}`;
    const { error: logErr } = await admin.from("transactions").insert({
      user_id: wd.user_id,
      type: "withdrawal",
      amount_usdt: 0, // No actual amount since it's rejected
      status: "rejected",
      description: description
    });

    if (logErr) {
      console.error("Error logging rejection:", logErr);
      // Don't fail the rejection, just log the error
    }

    // Note: We don't create a withdrawal transaction or update balances for rejected withdrawals
    // The user keeps their balance since the withdrawal was not processed

    return NextResponse.json({ 
      ok: true, 
      id: wd.id, 
      status: "rejected",
      reason: reason,
      message: "Withdrawal rejected successfully"
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
