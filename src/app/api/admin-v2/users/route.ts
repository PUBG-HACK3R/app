import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    console.log('🔍 Admin-v2 Users API called...');
    
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: "Not authenticated", details: authError?.message }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
      return NextResponse.json({ error: "Profile fetch failed", details: profileError.message }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      console.log('❌ Not admin:', profile?.role);
      return NextResponse.json({ error: "Forbidden", role: profile?.role }, { status: 403 });
    }

    console.log('✅ Admin role confirmed:', profile.email);

    // Get all users with their data
    const admin = getSupabaseAdminClient();

    // Get users first
    const { data: users, error: usersError } = await admin
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersError) {
      console.log('❌ Users fetch failed:', usersError.message);
      return NextResponse.json({ error: "Users fetch failed", details: usersError.message }, { status: 500 });
    }

    console.log(`✅ Fetched ${users?.length || 0} users`);

    // Get balances separately to avoid relationship issues
    const { data: balances } = await admin
      .from("user_balances")
      .select("*");

    // Get investment data for each user
    const { data: investments } = await admin
      .from("user_investments")
      .select("user_id, status, amount_invested, total_earned");

    // Process user data
    const processedUsers = (users || []).map((user: any) => {
      const userInvestments = (investments || []).filter((inv: any) => inv.user_id === user.user_id);
      
      return {
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
        created_at: user.created_at,
        balance: (balances || []).find((b: any) => b.user_id === user.user_id) || {
          available_balance: 0,
          locked_balance: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          total_earned: 0
        },
        investments: {
          active: userInvestments.filter((inv: any) => inv.status === 'active').length,
          completed: userInvestments.filter((inv: any) => inv.status === 'completed').length,
          total_invested: userInvestments.reduce((sum: number, inv: any) => sum + (inv.amount_invested || 0), 0)
        }
      };
    });

    console.log(`✅ Returning ${processedUsers.length} users`);

    return NextResponse.json({
      users: processedUsers,
      count: processedUsers.length
    });

  } catch (error: any) {
    console.error("❌ Users API error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
