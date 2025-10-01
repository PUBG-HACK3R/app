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

    // Also check if profiles table exists and has the referral_code column
    const { data: tableInfo, error: tableError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "profiles")
      .eq("table_schema", "public");

    // Check total count of profiles
    const { count: profileCount, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (profilesError) {
      return NextResponse.json({ 
        error: "Failed to fetch profiles", 
        details: profilesError.message,
        tableInfo: tableInfo || [],
        profileCount: profileCount || 0
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
      profileCount: profileCount || 0,
      tableColumns: tableInfo?.map(col => col.column_name) || [],
      hasReferralCodeColumn: tableInfo?.some(col => col.column_name === 'referral_code') || false,
      profiles: profiles.map(p => ({
        email: p.email,
        hasReferralCode: !!p.referral_code,
        referralCode: p.referral_code
      })),
      validationTest,
      fakeTest,
      troubleshooting: {
        message: profiles.length === 0 ? 
          "No profiles found. You need to either: 1) Run the create-referral-system.sql script in Supabase, or 2) Create some user accounts first" :
          "Profiles exist but may not have referral codes"
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Debug failed", 
      details: err.message 
    }, { status: 500 });
  }
}
