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

    console.log('🧪 TESTING: Admin APIs directly (no fetch)...');

    // Check admin role first
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: "Profile fetch failed", 
        details: profileError.message 
      }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: "Not admin", 
        profile: profile,
        user_id: user.id 
      }, { status: 403 });
    }

    // Test 1: Get users directly (same logic as admin-v2/users API)
    let usersResult = null;
    try {
      // Get users first
      const { data: users, error: usersError } = await admin
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) {
        usersResult = { error: usersError.message };
      } else {
        // Get balances separately to avoid relationship issues
        const { data: balances } = await admin
          .from("user_balances")
          .select("*");

        // Get investment data for each user
        const { data: investments } = await admin
          .from("user_investments")
          .select("user_id, status, amount_invested, total_earned");

        // Process user data (same as API)
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

        usersResult = {
          success: true,
          users: processedUsers,
          count: processedUsers.length
        };
      }
    } catch (error: any) {
      usersResult = { error: error.message };
    }

    // Test 2: Get withdrawals directly (same logic as admin-v2/withdrawals API)
    let withdrawalsResult = null;
    try {
      const { data: withdrawals, error: withdrawalsError } = await admin
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });

      if (withdrawalsError) {
        withdrawalsResult = { error: withdrawalsError.message };
      } else {
        // Get user emails separately
        const userIds = [...new Set(withdrawals?.map(w => w.user_id) || [])];
        const { data: userProfiles } = await admin
          .from("user_profiles")
          .select("user_id, email")
          .in("user_id", userIds);
        
        const emailMap = new Map(userProfiles?.map(p => [p.user_id, p.email]) || []);
        
        const formattedWithdrawals = (withdrawals || []).map((withdrawal: any) => ({
          id: withdrawal.id,
          user_id: withdrawal.user_id,
          user_email: emailMap.get(withdrawal.user_id) || 'Unknown',
          amount_usdt: withdrawal.amount_usdt || 0,
          wallet_address: withdrawal.wallet_address || withdrawal.address || '',
          status: withdrawal.status,
          created_at: withdrawal.created_at,
          processed_at: withdrawal.processed_at,
          admin_notes: withdrawal.admin_notes,
          expires_at: withdrawal.expires_at
        }));

        withdrawalsResult = {
          success: true,
          withdrawals: formattedWithdrawals,
          count: formattedWithdrawals.length
        };
      }
    } catch (error: any) {
      withdrawalsResult = { error: error.message };
    }

    return NextResponse.json({
      success: true,
      message: "Direct admin API testing completed",
      current_user: {
        id: user.id,
        profile: profile,
        is_admin: profile.role === 'admin'
      },
      test_results: {
        users_direct: usersResult,
        withdrawals_direct: withdrawalsResult
      },
      summary: {
        users_count: usersResult?.users?.length || 0,
        withdrawals_count: withdrawalsResult?.withdrawals?.length || 0,
        users_success: !usersResult?.error,
        withdrawals_success: !withdrawalsResult?.error
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test admin direct error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
