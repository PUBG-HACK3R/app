import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get balance from profiles table
    const { data: profileData } = await admin
      .from("profiles")
      .select("balance_usdt")
      .eq("user_id", user.id)
      .maybeSingle();

    const balance = Number(profileData?.balance_usdt || 0);

    // Also check if user has an active subscription
    const { data: activeSub } = await admin
      .from("subscriptions")
      .select("id, plan_id, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    return NextResponse.json({
      balance,
      has_active_subscription: !!activeSub,
      user_id: user.id
    });

  } catch (error) {
    console.error("User balance API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
