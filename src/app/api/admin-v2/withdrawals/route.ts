import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all withdrawals
    const admin = getSupabaseAdminClient();

    const { data: withdrawals } = await admin
      .from("withdrawals")
      .select(`
        *,
        user_profiles!inner (
          email
        )
      `)
      .order("created_at", { ascending: false });

    const formattedWithdrawals = (withdrawals || []).map((withdrawal: any) => ({
      id: withdrawal.id,
      user_id: withdrawal.user_id,
      user_email: withdrawal.user_profiles?.email || 'Unknown',
      amount_usdt: withdrawal.amount_usdt || 0,
      wallet_address: withdrawal.wallet_address || withdrawal.address || '',
      status: withdrawal.status,
      created_at: withdrawal.created_at,
      processed_at: withdrawal.processed_at,
      admin_notes: withdrawal.admin_notes
    }));

    return NextResponse.json({
      withdrawals: formattedWithdrawals
    });

  } catch (error) {
    console.error("Withdrawals API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
