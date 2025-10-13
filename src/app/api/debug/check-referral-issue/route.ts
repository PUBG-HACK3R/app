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

    console.log('🔍 DEBUGGING: Referral system issue...');
    console.log('Current user ID:', user.id);

    // Test 1: Get current user's profile
    const { data: currentProfile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    console.log('Current user profile:', currentProfile);

    // Test 2: Get ALL user profiles to see referred_by values
    const { data: allProfiles, error: allProfilesError } = await admin
      .from("user_profiles")
      .select("user_id, email, referred_by, referral_code")
      .order("created_at", { ascending: false });

    console.log('All user profiles:', allProfiles);

    // Test 3: Check specifically for users referred by current user
    const { data: referredUsers, error: referredError } = await admin
      .from("user_profiles")
      .select("user_id, email, referred_by, created_at")
      .eq("referred_by", user.id);

    console.log('Users referred by current user:', referredUsers);

    // Test 4: Check referral commissions
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    console.log('Referral commissions for current user:', commissions);

    // Test 5: Test the actual referrals API
    let referralsApiResult = null;
    try {
      const referralsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/referrals`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (referralsResponse.ok) {
        referralsApiResult = await referralsResponse.json();
      } else {
        referralsApiResult = { error: `HTTP ${referralsResponse.status}`, details: await referralsResponse.text() };
      }
    } catch (error: any) {
      referralsApiResult = { error: error.message };
    }

    // Analysis
    const usersWithCurrentUserAsReferrer = allProfiles?.filter(p => p.referred_by === user.id) || [];
    const usersWithReferralCode = allProfiles?.filter(p => p.referred_by === currentProfile?.referral_code) || [];

    return NextResponse.json({
      success: true,
      message: "Referral system debugging completed",
      current_user: {
        id: user.id,
        profile: currentProfile,
        referral_code: currentProfile?.referral_code
      },
      debug_results: {
        direct_referred_users: {
          count: referredUsers?.length || 0,
          users: referredUsers || []
        },
        all_profiles_analysis: {
          total_profiles: allProfiles?.length || 0,
          users_with_current_user_as_referrer: usersWithCurrentUserAsReferrer.length,
          users_with_referral_code_as_referrer: usersWithReferralCode.length,
          sample_profiles: allProfiles?.slice(0, 5) || []
        },
        commissions: {
          count: commissions?.length || 0,
          commissions: commissions || []
        },
        referrals_api_test: referralsApiResult
      },
      potential_issues: [
        referredUsers?.length === 0 ? "No users have current user's ID as referred_by" : null,
        usersWithReferralCode.length > 0 ? "Some users have referral_code as referred_by instead of user_id" : null,
        !currentProfile?.referral_code ? "Current user has no referral code" : null,
        commissionsError ? `Commission fetch error: ${commissionsError.message}` : null
      ].filter(Boolean),
      recommendations: [
        "Check if referred_by should be user_id or referral_code",
        "Verify referral assignment logic in signup process",
        "Check if referral system needs data migration",
        "Ensure referral codes are properly generated"
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Check referral issue error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
