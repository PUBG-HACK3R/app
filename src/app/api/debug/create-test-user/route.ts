import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const admin = getSupabaseAdminClient();

    // Create a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: testEmail,
      password: "testpassword123",
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ 
        error: "Failed to create auth user", 
        details: authError.message 
      }, { status: 500 });
    }

    // Create profile with referral code
    const referralCode = "TEST" + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const { data: profileData, error: profileError } = await admin
      .from("user_profiles")
      .insert({
        user_id: authData.user.id,
        email: testEmail,
        role: "user",
        referral_code: referralCode
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: "Failed to create profile", 
        details: profileError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      user: {
        email: testEmail,
        referralCode: referralCode,
        userId: authData.user.id
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Test user creation failed", 
      details: err.message 
    }, { status: 500 });
  }
}
