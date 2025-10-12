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

    console.log('🔍 REFERRAL DISPLAY TEST - User ID:', user.id);

    // Get user's profile
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", user.id)
      .single();

    console.log('👤 User Profile:', profile);

    // Get users referred by this user (the key query)
    const { data: referredUsers, error: referredError } = await admin
      .from("user_profiles")
      .select("user_id, email, created_at, referred_by")
      .eq("referred_by", user.id);

    console.log('👥 Users Referred by Current User:', referredUsers);
    console.log('📊 Count of Referred Users:', referredUsers?.length || 0);

    // Get commission records
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    console.log('💰 Commission Records:', commissions);

    // Test what the main API returns
    const mainApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/referrals`;
    console.log('🔗 Testing main API at:', mainApiUrl);

    return NextResponse.json({
      success: true,
      test_results: {
        user_id: user.id,
        user_email: user.email,
        profile: profile,
        profile_error: profileError?.message,
        referred_users: {
          count: referredUsers?.length || 0,
          users: referredUsers || [],
          error: referredError?.message
        },
        commissions: {
          count: commissions?.length || 0,
          total_amount: commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
          records: commissions || [],
          error: commissionsError?.message
        },
        expected_display: {
          totalReferrals: referredUsers?.length || 0,
          totalEarnings: commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
          referrals: referredUsers || [],
          commissions: commissions || []
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Referral display test error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
