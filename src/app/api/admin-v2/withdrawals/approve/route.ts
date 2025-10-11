import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { withdrawalId } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json({ error: "Withdrawal ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Get withdrawal details first
    const { data: withdrawal, error: fetchError } = await admin
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    // Update withdrawal status
    const { error } = await admin
      .from("withdrawals")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
        admin_notes: `Approved by ${profile.email || 'Admin'}`
      })
      .eq("id", withdrawalId);

    if (error) {
      console.error("Withdrawal approval error:", error);
      return NextResponse.json({ error: "Failed to approve withdrawal" }, { status: 500 });
    }

    // Log the approval transaction
    await admin.from("transaction_logs").insert({
      user_id: withdrawal.user_id,
      type: "withdrawal",
      amount_usdt: withdrawal.amount_usdt,
      description: `Withdrawal approved - ${withdrawal.wallet_address.substring(0, 8)}...${withdrawal.wallet_address.substring(withdrawal.wallet_address.length - 6)}`,
      status: "approved",
      reference_id: withdrawalId,
      meta: {
        approved_by: profile.email,
        admin_id: user.id,
        net_amount: withdrawal.net_amount_usdt,
        fee: withdrawal.fee_usdt
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Withdrawal approval error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
