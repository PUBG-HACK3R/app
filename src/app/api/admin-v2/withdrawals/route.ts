import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    console.log('🔍 Admin-v2 Withdrawals API called...');
    
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: "Not authenticated", details: authError?.message }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
      return NextResponse.json({ error: "Profile fetch failed", details: profileError.message }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      console.log('❌ Not admin:', profile?.role);
      return NextResponse.json({ error: "Forbidden", role: profile?.role }, { status: 403 });
    }

    console.log('✅ Admin role confirmed');

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

    console.log(`✅ Returning ${formattedWithdrawals.length} formatted withdrawals with emails`);

    return NextResponse.json({
      withdrawals: formattedWithdrawals,
      count: formattedWithdrawals.length
    });

  } catch (error: any) {
    console.error("❌ Withdrawals API error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
