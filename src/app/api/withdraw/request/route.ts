import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WithdrawSchema = z.object({
  amount: z.number().positive().min(30, "Minimum withdrawal amount is $30"),
  address: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { amount, address } = WithdrawSchema.parse(json);
    
    // Validate minimum amount
    if (amount < 30) {
      return NextResponse.json({ error: "Minimum withdrawal amount is $30" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check user balance
    const { data: transactions } = await supabase
      .from("transactions")
      .select("type, amount_usdt")
      .eq("user_id", user.id);

    const balance = (transactions || []).reduce((acc, tx) => {
      if (tx.type === "deposit" || tx.type === "earning") {
        return acc + Number(tx.amount_usdt || 0);
      } else if (tx.type === "withdrawal") {
        return acc - Number(tx.amount_usdt || 0);
      }
      return acc;
    }, 0);

    if (balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Calculate fee (5%) and net amount
    const feeAmount = Math.round(amount * 0.05 * 100) / 100; // 5% fee
    const netAmount = Math.round((amount - feeAmount) * 100) / 100;

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Ensure profile exists to satisfy FK constraint
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, email: user.email || "", role: "user" }, { onConflict: "user_id" });

    const { data: withdrawal, error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount_usdt: amount,
      fee_usdt: feeAmount,
      net_amount_usdt: netAmount,
      address,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ 
      ok: true, 
      withdrawal: {
        id: withdrawal.id,
        amount: amount,
        fee: feeAmount,
        net_amount: netAmount,
        address,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        created_at: withdrawal.created_at
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

