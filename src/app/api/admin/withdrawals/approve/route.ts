import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ApproveSchema = z.object({
  id: z.string().uuid(),
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
    const { id } = ApproveSchema.parse(body);

    const admin = getSupabaseAdminClient();

    // Fetch withdrawal
    const { data: wd, error: wdErr } = await admin
      .from("withdrawals")
      .select("id,user_id,amount_usdt,status")
      .eq("id", id)
      .single();
    if (wdErr || !wd) return NextResponse.json({ error: wdErr?.message || "Withdrawal not found" }, { status: 404 });
    if (wd.status !== "pending") return NextResponse.json({ error: "Withdrawal is not pending" }, { status: 400 });

    // Check balance
    const { data: bal } = await admin
      .from("balances")
      .select("available_usdt")
      .eq("user_id", wd.user_id)
      .maybeSingle();

    const currentBal = Number(bal?.available_usdt || 0);
    const amount = Number(wd.amount_usdt || 0);
    if (currentBal < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Approve withdrawal and insert transaction, update balances
    const now = new Date().toISOString();
    const { error: updErr } = await admin
      .from("withdrawals")
      .update({ status: "approved", approved_by: user.id, approved_at: now })
      .eq("id", wd.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    // Idempotency: avoid duplicate withdrawal transaction for same reference
    const { data: existing } = await admin
      .from("transactions")
      .select("id")
      .eq("type", "withdrawal")
      .eq("reference_id", wd.id)
      .maybeSingle();

    if (!existing) {
      await admin.from("transactions").insert({
        user_id: wd.user_id,
        type: "withdrawal",
        amount_usdt: amount,
        reference_id: wd.id,
        meta: { approved_by: user.id, approved_at: now },
      });
    }

    const newBal = currentBal - amount;
    await admin
      .from("balances")
      .update({ available_usdt: newBal })
      .eq("user_id", wd.user_id);

    return NextResponse.json({ ok: true, id: wd.id, new_balance: newBal });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
