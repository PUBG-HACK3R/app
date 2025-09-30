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

    const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    // Reject withdrawal
    const now = new Date().toISOString();
    const { error: updErr } = await admin
      .from("withdrawals")
      .update({ 
        status: "rejected", 
        approved_by: user.id, 
        approved_at: now,
        rejection_reason: reason
      })
      .eq("id", wd.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

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
