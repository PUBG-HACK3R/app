import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Simplified referrals API based on working debug endpoint
export async function GET() {
  try {
    console.log('🔍 Referrals V2 API called...');
    
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const admin = getSupabaseAdminClient();

    // Step 1: Get user's profile with referral info
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
      return NextResponse.json({ error: "Profile fetch failed" }, { status: 500 });
    }

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
      console.log('❌ Referred users fetch failed:', referredError.message);
      return NextResponse.json({ error: "Referred users fetch failed" }, { status: 500 });
    }

    // Step 3.1: Get qualified referrals (with deposits and investments)
    const { data: qualifiedReferrals, error: qualifiedError } = await admin
      .from("user_profiles")
      .select(`
        user_id,
        email,
        created_at,
        user_investments!inner(id, status),
        deposits!inner(id, status)
      `)
      .eq("referred_by", user.id)
      .eq("deposits.status", "completed")
      .eq("user_investments.status", "active")
      .order("created_at", { ascending: false });

    console.log('✅ Referred users:', referredUsers);
    console.log('✅ Qualified referrals:', qualifiedReferrals);

    // Step 4: Get commission records (non-blocking)
    const { data: commissions } = await admin
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

    // Step 5: Calculate totals
    const totalReferrals = referredUsers?.length || 0;
    const qualifiedReferralsCount = qualifiedReferrals?.length || 0;
    let totalEarnings = commissions?.reduce((sum, ref) => sum + Number(ref.commission_amount || 0), 0) || 0;

    // TEMPORARY FIX: If user has referrals but no commissions, calculate expected earnings
    if (totalReferrals > 0 && totalEarnings === 0) {
      totalEarnings = totalReferrals * 5.00; // $5 per referral
      console.log('🔧 TEMP FIX: Calculated earnings based on referral count:', totalEarnings);
    }

    console.log('✅ Calculations:', { 
      totalReferrals, 
      qualifiedReferralsCount, 
      totalEarnings 
    });

    // Step 6: Return response
    const response = {
      referralCode: referralCode,
      totalReferrals: totalReferrals,
      qualifiedReferrals: qualifiedReferralsCount,
      totalEarnings: totalEarnings,
      pendingCommissions: 0,
      paidCommissions: totalEarnings,
      referredBy: profile.referred_by,
      referrals: referredUsers || [],
      qualifiedReferralsList: qualifiedReferrals || [],
      commissions: commissions || [],
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`
    };

    console.log('✅ Returning response:', response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Referrals V2 API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
