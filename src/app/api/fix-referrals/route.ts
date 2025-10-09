import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fix referral codes for all users
export async function POST() {
  try {
    const admin = getSupabaseAdminClient();

    // Get all users without referral codes
    const { data: usersWithoutCodes, error: fetchError } = await admin
      .from("user_profiles")
      .select("user_id, email, referral_code")
      .is("referral_code", null);

    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch users", 
        details: fetchError.message 
      }, { status: 500 });
    }

    let updated = 0;
    let errors = [];

    // Generate referral codes for users who don't have them
    for (const user of usersWithoutCodes || []) {
      const referralCode = `REF${user.user_id.substring(0, 8).toUpperCase()}`;
      
      const { error: updateError } = await admin
        .from("user_profiles")
        .update({ referral_code: referralCode })
        .eq("user_id", user.user_id);

      if (updateError) {
        errors.push(`Failed to update ${user.email}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    // Get sample referral codes for testing
    const { data: sampleCodes } = await admin
      .from("user_profiles")
      .select("email, referral_code")
      .not("referral_code", "is", null)
      .limit(3);

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} users with referral codes`,
      usersWithoutCodes: usersWithoutCodes?.length || 0,
      updated,
      errors,
      sampleCodes: sampleCodes || [],
      testInstructions: "Use one of the sample codes above to test referral validation"
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: "Fix failed", 
      details: error.message 
    }, { status: 500 });
  }
}
