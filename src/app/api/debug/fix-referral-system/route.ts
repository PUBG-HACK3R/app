import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔧 FIXING REFERRAL SYSTEM...');

    // Step 1: Fix broken referral assignments (referred_by should be user_id, not referral_code)
    const { data: brokenReferrals, error: fetchError } = await admin
      .from("user_profiles")
      .select("user_id, email, referred_by")
      .not("referred_by", "is", null);

    let fixedReferrals = [];
    
    if (brokenReferrals) {
      for (const profile of brokenReferrals) {
        // Check if referred_by looks like a referral code (starts with REF)
        if (profile.referred_by && profile.referred_by.startsWith('REF')) {
          // Find the actual user_id for this referral code
          const { data: referrer } = await admin
            .from("user_profiles")
            .select("user_id")
            .eq("referral_code", profile.referred_by)
            .single();

          if (referrer) {
            // Update to use user_id instead of referral_code
            await admin
              .from("user_profiles")
              .update({ referred_by: referrer.user_id })
              .eq("user_id", profile.user_id);

            fixedReferrals.push({
              user_id: profile.user_id,
              email: profile.email,
              old_referred_by: profile.referred_by,
              new_referred_by: referrer.user_id
            });

            console.log(`✅ Fixed referral for ${profile.email}: ${profile.referred_by} → ${referrer.user_id}`);
          }
        }
      }
    }

    // Step 2: Create missing referral commission records
    const { data: usersWithReferrers } = await admin
      .from("user_profiles")
      .select("user_id, email, referred_by")
      .not("referred_by", "is", null);

    let createdCommissions = [];

    if (usersWithReferrers) {
      for (const profile of usersWithReferrers) {
        // Check if commission record exists
        const { data: existingCommission } = await admin
          .from("referral_commissions")
          .select("id")
          .eq("referred_user_id", profile.user_id)
          .single();

        if (!existingCommission) {
          // Create missing commission record
          const { data: newCommission, error: commissionError } = await admin
            .from("referral_commissions")
            .insert({
              referrer_user_id: profile.referred_by,
              referred_user_id: profile.user_id,
              source_type: 'signup',
              source_amount: 0,
              commission_percentage: 5.00,
              commission_amount: 0,
              status: 'active'
            })
            .select()
            .single();

          if (!commissionError) {
            createdCommissions.push({
              id: newCommission.id,
              referrer_user_id: profile.referred_by,
              referred_user_id: profile.user_id,
              referred_email: profile.email
            });

            console.log(`✅ Created commission record for ${profile.email}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Referral system fixed successfully",
      results: {
        fixed_referral_assignments: fixedReferrals.length,
        created_commission_records: createdCommissions.length,
        fixed_referrals: fixedReferrals,
        created_commissions: createdCommissions
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Fix referral system error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
