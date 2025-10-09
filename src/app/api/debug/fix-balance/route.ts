import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if balance record exists
    const { data: existingBalance } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingBalance) {
      return NextResponse.json({
        message: "Balance record already exists",
        balance: existingBalance
      });
    }

    // Create balance record
    const { data: newBalance, error } = await admin
      .from("user_balances")
      .insert({
        user_id: user.id,
        available_balance: 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "Balance record created successfully",
      balance: newBalance
    });

  } catch (error) {
    console.error("Fix balance API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
