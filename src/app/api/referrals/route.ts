import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

    // Get user's referral code and stats
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("referral_code, total_referrals, total_referral_earnings, referred_by")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Get referrals made by this user
    const { data: referrals, error: referralsError } = await supabase
      .from("referrals")
      .select(`
        id,
        referred_id,
        referral_code,
        created_at,
        status,
        profiles!referrals_referred_id_fkey(email)
      `)
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralsError) {
      return NextResponse.json({ error: referralsError.message }, { status: 400 });
    }

    // Get commission history
    const { data: commissions, error: commissionsError } = await supabase
      .from("referral_commissions")
      .select(`
        id,
        referred_id,
        commission_amount,
        commission_percentage,
        source_amount,
        source_type,
        created_at,
        status,
        profiles!referral_commissions_referred_id_fkey(email)
      `)
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (commissionsError) {
      return NextResponse.json({ error: commissionsError.message }, { status: 400 });
    }

    // Calculate pending and paid commissions
    const pendingCommissions = (commissions || [])
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);
    
    const paidCommissions = (commissions || [])
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    return NextResponse.json({
      referralCode: profile.referral_code,
      totalReferrals: profile.total_referrals || 0,
      totalEarnings: Number(profile.total_referral_earnings || 0),
      pendingCommissions,
      paidCommissions,
      referredBy: profile.referred_by,
      referrals: referrals || [],
      commissions: commissions || [],
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${profile.referral_code}`
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
      .from("profiles")
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
      .from("profiles")
      .select("referred_by")
      .eq("user_id", userId)
      .single();

    if (existingReferral?.referred_by) {
      return NextResponse.json({ error: "User is already referred by someone else" }, { status: 400 });
    }

    // Update user's profile with referrer information
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.user_id,
        referred_id: userId,
        referral_code: referralCode.toUpperCase(),
        status: 'active'
      });

    if (referralError) {
      return NextResponse.json({ error: referralError.message }, { status: 400 });
    }

    // Update referrer's total referrals count
    // First get current count
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("total_referrals")
      .eq("user_id", referrer.user_id)
      .single();

    const currentCount = currentProfile?.total_referrals || 0;
    
    const { error: countError } = await supabase
      .from("profiles")
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
