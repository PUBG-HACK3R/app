import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userEmail, referralCode } = await request.json();
    
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔧 MANUALLY FIXING REFERRAL...');
    console.log('User email:', userEmail);
    console.log('Referral code:', referralCode);

    // Find the user by email
    const { data: targetUser, error: userError } = await admin
      .from("user_profiles")
      .select("user_id, email, referred_by")
      .eq("email", userEmail)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ 
        error: "User not found", 
        details: userError?.message 
      }, { status: 404 });
    }

    // Find the referrer by referral code
    const { data: referrer, error: referrerError } = await admin
      .from("user_profiles")
      .select("user_id, email, referral_code")
      .eq("referral_code", referralCode.trim().toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ 
        error: "Invalid referral code", 
        details: referrerError?.message 
      }, { status: 400 });
    }

    // Check if user is trying to refer themselves
    if (referrer.user_id === targetUser.user_id) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Update the user's profile with referrer info
    const { error: updateError } = await admin
      .from("user_profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", targetUser.user_id);

    if (updateError) {
      return NextResponse.json({ 
        error: "Failed to update referral", 
        details: updateError.message 
      }, { status: 500 });
    }

    // Check if referral commission record already exists
    const { data: existingCommission } = await admin
      .from("referral_commissions")
      .select("id")
      .eq("referred_user_id", targetUser.user_id)
      .single();

    let commissionId = null;
    if (!existingCommission) {
      // Create referral commission record
      const { data: newCommission, error: commissionError } = await admin
        .from("referral_commissions")
        .insert({
          referrer_user_id: referrer.user_id,
          referred_user_id: targetUser.user_id,
          source_type: 'signup',
          source_amount: 0,
          commission_percentage: 5.00,
          commission_amount: 0,
          status: 'active'
        })
        .select()
        .single();

      if (commissionError) {
        console.warn('Failed to create commission record:', commissionError);
      } else {
        commissionId = newCommission.id;
      }
    } else {
      commissionId = existingCommission.id;
    }

    console.log(`✅ Manually fixed referral: ${targetUser.email} → ${referrer.email}`);

    return NextResponse.json({
      success: true,
      message: "Referral manually fixed",
      result: {
        referred_user: {
          user_id: targetUser.user_id,
          email: targetUser.email,
          old_referred_by: targetUser.referred_by,
          new_referred_by: referrer.user_id
        },
        referrer: {
          user_id: referrer.user_id,
          email: referrer.email,
          referral_code: referrer.referral_code
        },
        commission_id: commissionId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Manual referral fix error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
