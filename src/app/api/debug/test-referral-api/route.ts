import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔍 TESTING REFERRAL API...');
    console.log('Current user ID:', user.id);

    // Get user's profile
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", user.id)
      .single();

    console.log('User profile:', profile);

    // Get users referred by this user (from user_profiles table)
    const { data: referredUsers, error: referredError } = await admin
      .from("user_profiles")
      .select("user_id, email, created_at")
      .eq("referred_by", user.id);

    console.log('Referred users from user_profiles:', referredUsers);

    // Get commission records for this user
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    console.log('Commission records:', commissions);

    // Also check if there are users who should be referred to this user
    const { data: allUsers, error: allUsersError } = await admin
      .from("user_profiles")
      .select("user_id, email, referred_by, referral_code")
      .limit(10);

    console.log('Sample of all users:', allUsers);

    return NextResponse.json({
      success: true,
      debug_info: {
        current_user: {
          id: user.id,
          email: user.email,
          profile: profile
        },
        referred_users: {
          count: referredUsers?.length || 0,
          users: referredUsers || [],
          error: referredError?.message
        },
        commissions: {
          count: commissions?.length || 0,
          records: commissions || [],
          error: commissionsError?.message
        },
        all_users_sample: allUsers || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test referral API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
