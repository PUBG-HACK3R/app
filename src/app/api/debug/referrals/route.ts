import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    // Check existing referral codes
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, referral_code")
      .limit(10);

    if (profilesError) {
      return NextResponse.json({ 
        error: "Failed to fetch profiles", 
        details: profilesError.message 
      }, { status: 500 });
    }

    // Test referral code validation with first available code
    let validationTest = null;
    if (profiles.length > 0 && profiles[0].referral_code) {
      const testCode = profiles[0].referral_code;
      
      const { data: referrer, error: referrerError } = await supabase
        .from("profiles")
        .select("user_id, email, referral_code")
        .eq("referral_code", testCode.toUpperCase())
        .single();

      validationTest = {
        testCode,
        success: !referrerError,
        error: referrerError?.message,
        result: referrer
      };
    }

    // Test with fake code
    const { data: fakeReferrer, error: fakeError } = await supabase
      .from("profiles")
      .select("user_id, email, referral_code")
      .eq("referral_code", "FAKE123")
      .single();

    const fakeTest = {
      testCode: "FAKE123",
      success: !fakeError,
      error: fakeError?.message,
      result: fakeReferrer
    };

    return NextResponse.json({
      totalProfiles: profiles.length,
      profiles: profiles.map(p => ({
        email: p.email,
        hasReferralCode: !!p.referral_code,
        referralCode: p.referral_code
      })),
      validationTest,
      fakeTest
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Debug failed", 
      details: err.message 
    }, { status: 500 });
  }
}
