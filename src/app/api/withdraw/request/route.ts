import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WithdrawSchema = z.object({
  amount: z.number().positive(),
  address: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { amount, address } = WithdrawSchema.parse(json);
    if (!(amount > 0)) return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure profile exists to satisfy FK constraint
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, email: user.email || "", role: "user" }, { onConflict: "user_id" });

    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount_usdt: amount,
      address,
      status: "pending",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, amount, address, status: "pending" });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

