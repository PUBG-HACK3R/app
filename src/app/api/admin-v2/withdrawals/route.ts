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

    // First, let's try without the join to see if that's the issue
    const { data: withdrawals, error: withdrawalsError } = await admin
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    if (withdrawalsError) {
      console.error("Error fetching withdrawals:", withdrawalsError);
      return NextResponse.json({ 
        error: "Failed to fetch withdrawals", 
        details: withdrawalsError.message 
      }, { status: 500 });
    }

    console.log(`Found ${withdrawals?.length || 0} withdrawals in database`);
    
    // Get user emails separately
    const userIds = [...new Set(withdrawals?.map(w => w.user_id) || [])];
    const { data: userProfiles } = await admin
      .from("user_profiles")
      .select("user_id, email")
      .in("user_id", userIds);
    
    const emailMap = new Map(userProfiles?.map(p => [p.user_id, p.email]) || []);
    
    const formattedWithdrawals = (withdrawals || []).map((withdrawal: any) => ({
      id: withdrawal.id,
      user_id: withdrawal.user_id,
      user_email: emailMap.get(withdrawal.user_id) || 'Unknown',
      amount_usdt: withdrawal.amount_usdt || 0,
      wallet_address: withdrawal.wallet_address || withdrawal.address || '',
      status: withdrawal.status,
      created_at: withdrawal.created_at,
      processed_at: withdrawal.processed_at,
      admin_notes: withdrawal.admin_notes,
      expires_at: withdrawal.expires_at
    }));

    console.log(`Returning ${formattedWithdrawals.length} formatted withdrawals with emails`);

    return NextResponse.json({
      withdrawals: formattedWithdrawals
    });

  } catch (error) {
    console.error("Withdrawals API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
