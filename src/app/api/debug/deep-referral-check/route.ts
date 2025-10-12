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

    console.log('🔍 DEEP REFERRAL CHECK...');
    console.log('Current user ID:', user.id);
    console.log('Current user email:', user.email);

    // Step 1: Get current user's profile
    const { data: currentProfile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    console.log('Current user profile:', currentProfile);

    // Step 2: Get ALL user profiles to see the data structure
    const { data: allProfiles, error: allProfilesError } = await admin
      .from("user_profiles")
      .select("user_id, email, referral_code, referred_by, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    console.log('All user profiles (sample):', allProfiles);

    // Step 3: Specifically look for users who should be referred by current user
    const { data: shouldBeReferred, error: shouldBeReferredError } = await admin
      .from("user_profiles")
      .select("user_id, email, referral_code, referred_by, created_at")
      .eq("referred_by", user.id);

    console.log('Users referred by current user:', shouldBeReferred);

    // Step 4: Check if there are users with referral codes that match current user's code
    let usersWithCurrentUserCode: any[] = [];
    if (currentProfile?.referral_code) {
      const { data: usersWithCode } = await admin
        .from("user_profiles")
        .select("user_id, email, referral_code, referred_by, created_at")
        .eq("referred_by", currentProfile.referral_code); // Check if anyone has referral_code as referred_by (wrong format)

      usersWithCurrentUserCode = usersWithCode || [];
    }

    // Step 5: Get referral commissions
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    console.log('Referral commissions:', commissions);

    // Step 6: Test the actual API call that the frontend uses
    let apiTestResult = null;
    try {
      // Simulate the API call
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/referrals`, {
        headers: {
          'Cookie': `sb-access-token=${user.access_token}` // This won't work in server context, but we'll try
        }
      });
      
      if (testResponse.ok) {
        apiTestResult = await testResponse.json();
      }
    } catch (apiError) {
      console.log('API test failed (expected in server context):', apiError);
    }

    return NextResponse.json({
      success: true,
      debug_data: {
        current_user: {
          id: user.id,
          email: user.email,
          profile: currentProfile,
          profile_error: profileError?.message
        },
        all_profiles_sample: allProfiles || [],
        users_referred_by_current_user: {
          count: shouldBeReferred?.length || 0,
          users: shouldBeReferred || [],
          error: shouldBeReferredError?.message
        },
        users_with_wrong_format: {
          count: usersWithCurrentUserCode.length,
          users: usersWithCurrentUserCode,
          note: "These users have referral_code in referred_by field (wrong format)"
        },
        commissions: {
          count: commissions?.length || 0,
          records: commissions || [],
          error: commissionsError?.message
        },
        api_test_result: apiTestResult,
        recommendations: []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Deep referral check error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
