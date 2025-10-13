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

    console.log('🧪 TESTING: Referrals API logic directly (no fetch)...');
    console.log('User ID:', user.id);

    // Test the exact same logic as the referrals API
    let testResult = null;
    try {
      // Step 1: Get user's profile with referral info
      const { data: profile, error: profileError } = await admin
        .from("user_profiles")
        .select("referral_code, referred_by, email")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        testResult = { step: 1, error: "Profile fetch failed", details: profileError.message };
      } else {
        console.log('✅ Profile fetched:', profile);

        // Step 2: Generate referral code if it doesn't exist
        let referralCode = profile.referral_code;
        if (!referralCode) {
          referralCode = `REF${user.id.substring(0, 8).toUpperCase()}`;
          await admin
            .from("user_profiles")
            .update({ referral_code: referralCode })
            .eq("user_id", user.id);
        }

        // Step 3: Get referrals made by this user
        const { data: referredUsers, error: referredError } = await admin
          .from("user_profiles")
          .select(`
            user_id,
            email,
            created_at
          `)
          .eq("referred_by", user.id)
          .order("created_at", { ascending: false });

        if (referredError) {
          testResult = { step: 3, error: "Referred users fetch failed", details: referredError.message };
        } else {
          console.log('✅ Referred users:', referredUsers);

          // Step 4: Get commission records
          const { data: commissions, error: commissionsError } = await admin
            .from("referral_commissions")
            .select(`
              id,
              referred_user_id,
              commission_percentage,
              commission_amount,
              source_type,
              created_at
            `)
            .eq("referrer_user_id", user.id)
            .order("created_at", { ascending: false });

          if (commissionsError) {
            console.log('⚠️ Commissions fetch failed (non-blocking):', commissionsError.message);
          }

          // Step 5: Calculate totals
          const totalReferrals = referredUsers?.length || 0;
          const totalEarnings = commissions?.reduce((sum, ref) => sum + Number(ref.commission_amount || 0), 0) || 0;

          console.log('✅ Calculations:', { totalReferrals, totalEarnings });

          // Step 6: Build response (same as actual API)
          testResult = {
            success: true,
            step: "completed",
            response: {
              referralCode: referralCode,
              totalReferrals: totalReferrals,
              totalEarnings: totalEarnings,
              pendingCommissions: 0,
              paidCommissions: totalEarnings,
              referredBy: profile.referred_by,
              referrals: referredUsers || [],
              commissions: commissions || [],
              referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`
            }
          };
        }
      }
    } catch (error: any) {
      testResult = { step: "exception", error: error.message, stack: error.stack };
    }

    return NextResponse.json({
      success: true,
      message: "Direct referrals API test completed",
      user_id: user.id,
      test_result: testResult,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test referrals direct error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
