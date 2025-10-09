import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
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

    // Get all users with their data
    const admin = getSupabaseAdminClient();

    const { data: users } = await admin
      .from("user_profiles")
      .select(`
        *,
        user_balances (
          available_balance,
          locked_balance,
          total_deposited,
          total_withdrawn,
          total_earned
        )
      `)
      .order("created_at", { ascending: false });

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
        balance: user.user_balances?.[0] || {
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

    return NextResponse.json({
      users: processedUsers
    });

  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
