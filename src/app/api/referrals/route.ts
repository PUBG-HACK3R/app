import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Get user's referral information
export async function GET(request: Request) {
  try {
    console.log('🔍 Referrals API called...');
    
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: "Unauthorized", details: authError?.message }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const admin = getSupabaseAdminClient();

    // Get user's profile with referral info
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
      return NextResponse.json({ error: "Profile fetch failed", details: profileError.message }, { status: 500 });
    }

    console.log('✅ Profile fetched:', profile.email, 'Referral code:', profile.referral_code);

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

    if (referredError) {
      console.log('❌ Referred users fetch failed:', referredError.message);
      return NextResponse.json({ error: "Referred users fetch failed", details: referredError.message }, { status: 500 });
    }

    console.log(`✅ Found ${referredUsers?.length || 0} referred users`);

    // Get commission records for this user
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
      console.log('❌ Commissions fetch failed:', commissionsError.message);
      // Don't fail the whole API for commissions error, just log it
    }

    console.log(`✅ Found ${commissions?.length || 0} commission records`);

    // Calculate totals
    const totalReferrals = referredUsers?.length || 0;
    const totalEarnings = commissions?.reduce((sum, ref) => sum + Number(ref.commission_amount || 0), 0) || 0;

    console.log(`✅ Calculated totals - Referrals: ${totalReferrals}, Earnings: $${totalEarnings}`);

    return NextResponse.json({
      referralCode: referralCode,
      totalReferrals: totalReferrals,
      totalEarnings: totalEarnings,
      pendingCommissions: 0,
      paidCommissions: totalEarnings,
      referredBy: profile.referred_by,
      referrals: referredUsers || [],
      commissions: commissions || [],
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`
    });
  } catch (err: any) {
    console.error('❌ Referrals API error:', err);
    return NextResponse.json({ 
      error: err.message || "Unexpected error",
      details: err.stack 
    }, { status: 500 });
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

    // Note: total_referrals column doesn't exist in schema
    // Referral count is calculated dynamically from referral_commissions table

    return NextResponse.json({ 
      success: true, 
      message: "Referral applied successfully",
      referrer: referrer.user_id
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
