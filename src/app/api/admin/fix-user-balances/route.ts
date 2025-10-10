import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();
    
    // Get all user profiles
    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles")
      .select("user_id, email");

    if (profilesError) {
      return NextResponse.json({ 
        error: "Failed to fetch user profiles",
        details: profilesError.message 
      }, { status: 500 });
    }

    let fixedCount = 0;
    let errors = [];

    // Check each user for missing balance record
    for (const userProfile of profiles || []) {
      try {
        const { data: existingBalance } = await admin
          .from("user_balances")
          .select("id")
          .eq("user_id", userProfile.user_id)
          .single();

        if (!existingBalance) {
          // Create missing balance record
          const { error: balanceError } = await admin
            .from("user_balances")
            .insert({
              user_id: userProfile.user_id,
              available_balance: 0,
              locked_balance: 0,
              total_deposited: 0,
              total_withdrawn: 0,
              total_earned: 0
            });

          if (balanceError) {
            errors.push(`Failed to create balance for ${userProfile.email}: ${balanceError.message}`);
          } else {
            fixedCount++;
            console.log(`✅ Created balance record for ${userProfile.email}`);
          }
        }
      } catch (error: any) {
        errors.push(`Error processing ${userProfile.email}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Balance fix completed`,
      stats: {
        totalUsers: profiles?.length || 0,
        fixedUsers: fixedCount,
        errors: errors.length
      },
      errors: errors.slice(0, 10) // Limit error output
    });

  } catch (error: any) {
    console.error("Fix user balances error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
