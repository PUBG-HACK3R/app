import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check and fix referral relationships
export async function GET() {
  try {
    const admin = getSupabaseAdminClient();

    // Get all profiles with referrer info
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("user_id, email, referral_code, referred_by")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get all referral records
    const { data: referrals, error: referralsError } = await admin
      .from("referrals")
      .select(`
        id,
        referrer_id,
        referred_id,
        commission_rate,
        total_earned,
        created_at,
        referrer:profiles!referrals_referrer_id_fkey(email),
        referred:profiles!referrals_referred_id_fkey(email)
      `)
      .order("created_at", { ascending: false });

    // Count referrals per user
    const referralCounts: { [key: string]: number } = {};
    referrals?.forEach(ref => {
      const referrerId = ref.referrer_id;
      referralCounts[referrerId] = (referralCounts[referrerId] || 0) + 1;
    });

    // Find users who have referred_by but no referral record
    const missingReferrals = profiles?.filter(profile => {
      if (!profile.referred_by) return false;
      
      // Check if referral record exists
      const hasReferralRecord = referrals?.some(ref => 
        ref.referrer_id === profile.referred_by && 
        ref.referred_id === profile.user_id
      );
      
      return !hasReferralRecord;
    }) || [];

    return NextResponse.json({
      summary: {
        totalUsers: profiles?.length || 0,
        totalReferralRecords: referrals?.length || 0,
        usersWithReferrers: profiles?.filter(p => p.referred_by).length || 0,
        missingReferralRecords: missingReferrals.length
      },
      referralCounts,
      profiles: profiles?.map(p => ({
        email: p.email,
        referralCode: p.referral_code,
        hasReferrer: !!p.referred_by,
        referralCount: referralCounts[p.user_id] || 0
      })),
      referralRecords: referrals?.map(r => ({
        referrerEmail: (r.referrer as any)?.email,
        referredEmail: (r.referred as any)?.email,
        commissionRate: r.commission_rate,
        totalEarned: r.total_earned,
        createdAt: r.created_at
      })),
      missingReferrals: missingReferrals.map(p => ({
        email: p.email,
        referredBy: p.referred_by,
        needsReferralRecord: true
      })),
      instructions: {
        message: missingReferrals.length > 0 
          ? `Found ${missingReferrals.length} users with referrers but no referral records. Use POST /api/check-referrals to fix them.`
          : "All referral relationships are properly recorded!"
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: "Check failed", 
      details: error.message 
    }, { status: 500 });
  }
}

// Fix missing referral records
export async function POST() {
  try {
    const admin = getSupabaseAdminClient();

    // Get all profiles with referrer info
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, email, referred_by")
      .not("referred_by", "is", null);

    // Get existing referral records
    const { data: existingReferrals } = await admin
      .from("referrals")
      .select("referrer_id, referred_id");

    let fixed = 0;
    let errors = [];

    for (const profile of profiles || []) {
      // Check if referral record already exists
      const exists = existingReferrals?.some(ref => 
        ref.referrer_id === profile.referred_by && 
        ref.referred_id === profile.user_id
      );

      if (!exists) {
        // Create missing referral record
        const { error } = await admin
          .from("referrals")
          .insert({
            referrer_id: profile.referred_by,
            referred_id: profile.user_id,
            commission_rate: 5.00,
            total_earned: 0.00
          });

        if (error) {
          errors.push(`Failed to create referral for ${profile.email}: ${error.message}`);
        } else {
          fixed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} missing referral records`,
      fixed,
      errors,
      nextStep: "Check GET /api/check-referrals to verify the fix"
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: "Fix failed", 
      details: error.message 
    }, { status: 500 });
  }
}
