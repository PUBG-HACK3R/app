import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Get user's referral information
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdminClient();

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

    // Get referrals made by this user (people who used this user's referral code)
    const { data: referrals, error: referralsError } = await admin
      .from("referral_commissions")
      .select(`
        id,
        referred_user_id,
        commission_percentage,
        commission_amount,
        created_at
      `)
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    // Calculate totals
    const totalReferrals = referrals?.length || 0;
    const totalEarnings = referrals?.reduce((sum, ref) => sum + Number(ref.commission_amount || 0), 0) || 0;

    return NextResponse.json({
      referralCode: referralCode,
      totalReferrals: totalReferrals,
      totalEarnings: totalEarnings,
      pendingCommissions: 0, // We'll implement this later
      paidCommissions: totalEarnings,
      referredBy: profile.referred_by,
      referrals: referrals || [],
      commissions: [], // We'll implement commission tracking later
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

// Apply referral code during registration
export async function POST(request: Request) {
  try {
    const { referralCode, userId } = await request.json();
    
    if (!referralCode || !userId) {
      return NextResponse.json({ error: "Referral code and user ID are required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Find the referrer by referral code
    const { data: referrer, error: referrerError } = await supabase
      .from("user_profiles")
      .select("user_id, referral_code")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    // Check if user is trying to refer themselves
    if (referrer.user_id === userId) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Check if user is already referred
    const { data: existingReferral } = await supabase
      .from("user_profiles")
      .select("referred_by")
      .eq("user_id", userId)
      .single();

    if (existingReferral?.referred_by) {
      return NextResponse.json({ error: "User is already referred by someone else" }, { status: 400 });
    }

    // Update user's profile with referrer information
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from("referral_commissions")
      .insert({
        referrer_user_id: referrer.user_id,
        referred_user_id: userId,
        source_type: 'deposit',
        source_amount: 0,
        commission_percentage: 5.00,
        commission_amount: 0,
        status: 'pending'
      });

    if (referralError) {
      return NextResponse.json({ error: referralError.message }, { status: 400 });
    }

    // Update referrer's total referrals count
    // First get current count
    const { data: currentProfile } = await supabase
      .from("user_profiles")
      .select("total_referrals")
      .eq("user_id", referrer.user_id)
      .single();

    const currentCount = currentProfile?.total_referrals || 0;
    
    const { error: countError } = await supabase
      .from("user_profiles")
      .update({ 
        total_referrals: currentCount + 1
      })
      .eq("user_id", referrer.user_id);

    if (countError) {
      console.error("Error updating referral count:", countError);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Referral applied successfully",
      referrer: referrer.user_id
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
