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

    // Check admin role directly using admin client (same method as admin page)
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: adminCheckError } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (adminCheckError || !profile || profile.role !== 'admin') {
      console.log("Approve withdrawal API - Profile error or not admin:", adminCheckError, profile?.role);
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

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

    // Check balance using transactions
    const { data: transactions } = await admin
      .from("transaction_logs")
      .select("type, amount_usdt")
      .eq("user_id", wd.user_id);

    const currentBal = (transactions || []).reduce((acc, tx) => {
      if (tx.type === "deposit" || tx.type === "earning") {
        return acc + Number(tx.amount_usdt || 0);
      } else if (tx.type === "withdrawal") {
        return acc - Number(tx.amount_usdt || 0);
      }
      return acc;
    }, 0);

    const amount = Number(wd.amount_usdt || 0);
    if (currentBal < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Approve withdrawal and insert transaction
    const { error: updErr } = await admin
      .from("withdrawals")
      .update({ status: "approved" })
      .eq("id", wd.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    // Create withdrawal transaction record
    const description = `Withdrawal approved by admin: ${user.id}`;
    const { error: txErr } = await admin.from("transaction_logs").insert({
      user_id: wd.user_id,
      type: "withdrawal",
      amount_usdt: amount,
      status: "completed",
      description: description
    });

    if (txErr) {
      console.error("Error creating withdrawal transaction:", txErr);
      // Don't fail the approval, just log the error
    }

    // CRITICAL FIX: Also deduct from balances table to keep systems in sync
    // First get current balance, then update it
    const { data: currentBalance } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", wd.user_id)
      .single();

    const newAvailableBalance = Number(currentBalance?.available_balance || 0) - amount;

    const { error: balanceErr } = await admin
      .from("user_balances")
      .update({ 
        available_balance: newAvailableBalance 
      })
      .eq("user_id", wd.user_id);

    if (balanceErr) {
      console.error("Error updating balance:", balanceErr);
      // This is critical - if balance update fails, we should log it but not fail the approval
      // since the transaction record was already created
    }

    const newBal = currentBal - amount;
    return NextResponse.json({ ok: true, id: wd.id, new_balance: newBal });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
