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

    // Test the same logic as the main referrals API
    console.log('🧪 TESTING: Referral display logic...');

    // Get user's profile with referral info
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Generate referral code if it doesn't exist
    let referralCode = profile.referral_code;
    if (!referralCode) {
      referralCode = `REF${user.id.substring(0, 8).toUpperCase()}`;
      await admin
        .from("user_profiles")
        .update({ referral_code: referralCode })
        .eq("user_id", user.id);
    }

    // Get referrals made by this user (people who have referred_by = this user's ID)
    const { data: referredUsers, error: referredError } = await admin
      .from("user_profiles")
      .select(`
        user_id,
        email,
        created_at
      `)
      .eq("referred_by", user.id)
      .order("created_at", { ascending: false });

    // Get commission records for this user
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select(`
        id,
        referred_user_id,
        commission_percentage,
        commission_amount,
        source_type,
        status,
        created_at
      `)
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    // Calculate totals
    const totalReferrals = referredUsers?.length || 0;
    const totalEarnings = commissions?.reduce((sum, ref) => sum + Number(ref.commission_amount || 0), 0) || 0;

    // Get recent referral commission transactions
    const { data: referralTxs, error: txError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "referral_commission")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      test_results: {
        user_id: user.id,
        profile: profile,
        referral_code: referralCode,
        calculation_results: {
          referred_users_count: referredUsers?.length || 0,
          commissions_count: commissions?.length || 0,
          total_referrals: totalReferrals,
          total_earnings: totalEarnings,
          calculation_method: "Array length for referrals, sum of commission_amount for earnings"
        },
        raw_data: {
          referred_users: referredUsers || [],
          commissions: commissions || [],
          referral_transactions: referralTxs || []
        },
        api_response_simulation: {
          referralCode: referralCode,
          totalReferrals: totalReferrals,
          totalEarnings: totalEarnings,
          pendingCommissions: commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0,
          paidCommissions: commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0,
          referredBy: profile.referred_by,
          referrals: referredUsers || [],
          commissions: commissions || [],
          referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test referral display error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
