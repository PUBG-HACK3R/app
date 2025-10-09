import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdminClient();
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    
    console.log("🔍 Testing user creation with:", { testEmail });
    
    // Step 1: Create user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({
        success: false,
        step: "auth_creation",
        error: authError.message,
        details: authError
      }, { status: 400 });
    }

    console.log("✅ User created:", authData.user.id);

    // Step 2: Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check if profile was created by trigger
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    console.log("🔍 Profile check:", { profile, profileError });

    // Step 4: Check if balance was created by trigger
    const { data: balance, error: balanceError } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    console.log("🔍 Balance check:", { balance, balanceError });

    // Step 5: Manual creation if needed
    let profileCreated = false;
    let balanceCreated = false;

    if (profileError || !profile) {
      const referralCode = `REF${authData.user.id.substring(0, 8).toUpperCase()}`;
      const { error: manualProfileError } = await admin.from("user_profiles").insert({
        user_id: authData.user.id,
        email: authData.user.email,
        role: "user",
        referral_code: referralCode,
      });
      
      if (manualProfileError) {
        console.error("❌ Manual profile creation failed:", manualProfileError);
      } else {
        profileCreated = true;
        console.log("✅ Manual profile created");
      }
    }

    if (balanceError || !balance) {
      const { error: manualBalanceError } = await admin.from("user_balances").insert({
        user_id: authData.user.id,
        available_balance: 0,
        locked_balance: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        total_earned: 0
      });
      
      if (manualBalanceError) {
        console.error("❌ Manual balance creation failed:", manualBalanceError);
      } else {
        balanceCreated = true;
        console.log("✅ Manual balance created");
      }
    }

    // Final verification
    const { data: finalProfile } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    const { data: finalBalance } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      email: testEmail,
      trigger_results: {
        profile_by_trigger: !!profile && !profileError,
        balance_by_trigger: !!balance && !balanceError,
      },
      manual_creation: {
        profile_created: profileCreated,
        balance_created: balanceCreated,
      },
      final_state: {
        profile: finalProfile,
        balance: finalBalance,
      },
      errors: {
        auth_error: authError,
        profile_error: profileError,
        balance_error: balanceError,
      }
    });

  } catch (error: any) {
    console.error("🚨 Test signup error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
