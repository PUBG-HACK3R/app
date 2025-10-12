import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { referralCode } = await request.json();
    
    const admin = getSupabaseAdminClient();

    console.log('🔍 CHECKING SIGNUP FLOW...');
    console.log('Referral code provided:', referralCode);

    // Step 1: Check if referral code exists
    if (referralCode) {
      const { data: referrer, error: referrerError } = await admin
        .from("user_profiles")
        .select("user_id, email, referral_code")
        .eq("referral_code", referralCode.trim().toUpperCase())
        .single();

      console.log('Referrer lookup result:', { referrer, referrerError });

      if (referrer) {
        console.log(`✅ Valid referral code: ${referralCode} belongs to ${referrer.email} (${referrer.user_id})`);
      } else {
        console.log(`❌ Invalid referral code: ${referralCode}`);
      }

      return NextResponse.json({
        success: true,
        referralCode: referralCode,
        referrer: referrer || null,
        isValid: !!referrer,
        error: referrerError?.message || null
      });
    }

    return NextResponse.json({
      success: true,
      message: "No referral code provided"
    });

  } catch (error: any) {
    console.error('Check signup flow error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
