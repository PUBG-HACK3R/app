import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    // First, let's check if we can access the profiles table at all
    let profilesAccessible = true;
    let profilesError = null;
    let profiles = [];
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, referral_code")
        .limit(10);
      
      if (error) {
        profilesAccessible = false;
        profilesError = error.message;
      } else {
        profiles = data || [];
      }
    } catch (err: any) {
      profilesAccessible = false;
      profilesError = err.message;
    }

    // Check table structure using a different approach
    let tableInfo = [];
    let tableError = null;
    
    try {
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'profiles' });
      
      if (error) {
        // Fallback: try direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("information_schema.columns")
          .select("column_name")
          .eq("table_name", "profiles")
          .eq("table_schema", "public");
        
        if (fallbackError) {
          tableError = fallbackError.message;
        } else {
          tableInfo = fallbackData || [];
        }
      } else {
        tableInfo = data || [];
      }
    } catch (err: any) {
      tableError = err.message;
    }

    // Check total count of profiles
    let profileCount = 0;
    let countError = null;
    
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        countError = error.message;
      } else {
        profileCount = count || 0;
      }
    } catch (err: any) {
      countError = err.message;
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
      // Basic info
      totalProfiles: profiles.length,
      profileCount: profileCount,
      profilesAccessible,
      
      // Table structure
      tableColumns: tableInfo?.map(col => col.column_name || col) || [],
      hasReferralCodeColumn: tableInfo?.some(col => (col.column_name || col) === 'referral_code') || false,
      
      // Profiles data
      profiles: profiles.map(p => ({
        email: p.email,
        hasReferralCode: !!p.referral_code,
        referralCode: p.referral_code
      })),
      
      // Test results
      validationTest,
      fakeTest,
      
      // Error details
      errors: {
        profilesError,
        tableError,
        countError
      },
      
      // Troubleshooting
      troubleshooting: {
        message: !profilesAccessible ? 
          `Cannot access profiles table: ${profilesError}` :
          profiles.length === 0 ? 
            "Profiles table exists but is empty. Create a user account first, then run the referral SQL script." :
            "Profiles exist but may not have referral codes",
        suggestions: [
          !profilesAccessible ? "Check if profiles table exists in Supabase" : null,
          profileCount === 0 ? "Create a user account first" : null,
          !tableInfo?.some(col => (col.column_name || col) === 'referral_code') ? "Run the fix-referral-system.sql script" : null
        ].filter(Boolean)
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Debug failed", 
      details: err.message 
    }, { status: 500 });
  }
}
