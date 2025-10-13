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

    console.log('🧪 TESTING: Admin-v2 APIs specifically...');

    // Test 1: Users API
    let usersTest = null;
    try {
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin-v2/users`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (usersResponse.ok) {
        usersTest = await usersResponse.json();
      } else {
        usersTest = { error: `HTTP ${usersResponse.status}`, details: await usersResponse.text() };
      }
    } catch (error: any) {
      usersTest = { error: error.message };
    }

    // Test 2: Withdrawals API
    let withdrawalsTest = null;
    try {
      const withdrawalsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin-v2/withdrawals`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (withdrawalsResponse.ok) {
        withdrawalsTest = await withdrawalsResponse.json();
      } else {
        withdrawalsTest = { error: `HTTP ${withdrawalsResponse.status}`, details: await withdrawalsResponse.text() };
      }
    } catch (error: any) {
      withdrawalsTest = { error: error.message };
    }

    // Test 3: Dashboard Stats API
    let dashboardTest = null;
    try {
      const dashboardResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin-v2/dashboard/stats`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (dashboardResponse.ok) {
        dashboardTest = await dashboardResponse.json();
      } else {
        dashboardTest = { error: `HTTP ${dashboardResponse.status}`, details: await dashboardResponse.text() };
      }
    } catch (error: any) {
      dashboardTest = { error: error.message };
    }

    // Test 4: Direct database queries for comparison
    const [
      directUsers,
      directWithdrawals,
      directProfiles
    ] = await Promise.all([
      admin.from('user_profiles').select('*'),
      admin.from('withdrawals').select('*'),
      admin.from('user_profiles').select('role').eq('user_id', user.id).single()
    ]);

    return NextResponse.json({
      success: true,
      message: "Admin-v2 API testing completed",
      current_user: {
        id: user.id,
        profile: directProfiles.data,
        is_admin: directProfiles.data?.role === 'admin'
      },
      test_results: {
        users_api: {
          status: usersTest?.error ? 'FAILED' : 'SUCCESS',
          data: usersTest,
          user_count: usersTest?.users?.length || 0,
          sample_user: usersTest?.users?.[0] || null
        },
        withdrawals_api: {
          status: withdrawalsTest?.error ? 'FAILED' : 'SUCCESS',
          data: withdrawalsTest,
          withdrawal_count: withdrawalsTest?.withdrawals?.length || 0,
          sample_withdrawal: withdrawalsTest?.withdrawals?.[0] || null
        },
        dashboard_api: {
          status: dashboardTest?.error ? 'FAILED' : 'SUCCESS',
          data: dashboardTest,
          stats_summary: dashboardTest ? {
            totalUsers: dashboardTest.totalUsers,
            totalDeposits: dashboardTest.totalDeposits,
            totalWithdrawals: dashboardTest.totalWithdrawals,
            pendingWithdrawals: dashboardTest.pendingWithdrawals
          } : null
        },
        direct_database_queries: {
          total_users_in_db: directUsers.data?.length || 0,
          total_withdrawals_in_db: directWithdrawals.data?.length || 0,
          sample_user_from_db: directUsers.data?.[0] || null,
          sample_withdrawal_from_db: directWithdrawals.data?.[0] || null
        }
      },
      issues_identified: [
        usersTest?.error ? `Users API Error: ${usersTest.error}` : null,
        withdrawalsTest?.error ? `Withdrawals API Error: ${withdrawalsTest.error}` : null,
        dashboardTest?.error ? `Dashboard API Error: ${dashboardTest.error}` : null,
        directProfiles.data?.role !== 'admin' ? 'Current user is not admin' : null
      ].filter(Boolean),
      recommendations: [
        "Check if user has admin role in database",
        "Verify API authentication is working",
        "Check database has actual data",
        "Ensure frontend is mapping API responses correctly"
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test admin-v2 APIs error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
