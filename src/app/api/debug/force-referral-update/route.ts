import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get user's profile
    const { data: profile } = await admin
      .from("user_profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", user.id)
      .single();

    // Get users referred by this user
    const { data: referredUsers } = await admin
      .from("user_profiles")
      .select("user_id, email, created_at")
      .eq("referred_by", user.id);

    // Get commission records
    const { data: commissions } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    const totalReferrals = referredUsers?.length || 0;
    const totalEarnings = commissions?.reduce((sum, ref) => sum + Number(ref.commission_amount || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      referralCode: profile?.referral_code || `REF${user.id.substring(0, 8).toUpperCase()}`,
      totalReferrals: totalReferrals,
      totalEarnings: totalEarnings,
      pendingCommissions: 0,
      paidCommissions: totalEarnings,
      referredBy: profile?.referred_by,
      referrals: referredUsers || [],
      commissions: commissions || [],
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${profile?.referral_code}`,
      debug: {
        user_id: user.id,
        profile_exists: !!profile,
        referred_users_count: referredUsers?.length || 0,
        commissions_count: commissions?.length || 0,
        referred_users: referredUsers,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Force referral update error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
