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

    console.log('🧪 TESTING: Admin panel APIs and data flow...');

    // Test 1: Dashboard Stats API
    let dashboardStats = null;
    try {
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/dashboard/stats`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (statsResponse.ok) {
        dashboardStats = await statsResponse.json();
      } else {
        dashboardStats = { error: `HTTP ${statsResponse.status}`, details: await statsResponse.text() };
      }
    } catch (error: any) {
      dashboardStats = { error: error.message };
    }

    // Test 2: Users API
    let usersData = null;
    try {
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/users`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (usersResponse.ok) {
        usersData = await usersResponse.json();
      } else {
        usersData = { error: `HTTP ${usersResponse.status}`, details: await usersResponse.text() };
      }
    } catch (error: any) {
      usersData = { error: error.message };
    }

    // Test 3: Withdrawals API
    let withdrawalsData = null;
    try {
      const withdrawalsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/withdrawals`, {
        headers: {
          'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (withdrawalsResponse.ok) {
        withdrawalsData = await withdrawalsResponse.json();
      } else {
        withdrawalsData = { error: `HTTP ${withdrawalsResponse.status}`, details: await withdrawalsResponse.text() };
      }
    } catch (error: any) {
      withdrawalsData = { error: error.message };
    }

    // Test 4: Direct database queries for comparison
    const [
      directUsers,
      directBalances,
      directInvestments,
      directWithdrawals,
      directDeposits
    ] = await Promise.all([
      admin.from('user_profiles').select('*').limit(5),
      admin.from('user_balances').select('*').limit(5),
      admin.from('user_investments').select('*').limit(5),
      admin.from('withdrawals').select('*').limit(5),
      admin.from('deposits').select('*').limit(5)
    ]);

    // Calculate basic stats from direct queries
    const directStats = {
      total_users: directUsers.data?.length || 0,
      total_balances: directBalances.data?.length || 0,
      total_investments: directInvestments.data?.length || 0,
      total_withdrawals: directWithdrawals.data?.length || 0,
      total_deposits: directDeposits.data?.length || 0,
      sample_user: directUsers.data?.[0] || null,
      sample_balance: directBalances.data?.[0] || null,
      sample_investment: directInvestments.data?.[0] || null,
      sample_withdrawal: directWithdrawals.data?.[0] || null
    };

    return NextResponse.json({
      success: true,
      message: "Admin panel API testing completed",
      test_results: {
        dashboard_stats_api: {
          status: dashboardStats?.success ? 'SUCCESS' : 'FAILED',
          data: dashboardStats,
          expected_fields: ['users', 'finances', 'deposits', 'investments', 'withdrawals', 'earnings']
        },
        users_api: {
          status: usersData?.success ? 'SUCCESS' : 'FAILED',
          data: usersData,
          user_count: usersData?.users?.length || 0,
          summary: usersData?.summary || null
        },
        withdrawals_api: {
          status: withdrawalsData?.success ? 'SUCCESS' : 'FAILED',
          data: withdrawalsData,
          withdrawal_count: withdrawalsData?.withdrawals?.length || 0,
          summary: withdrawalsData?.summary || null
        },
        direct_database_queries: {
          status: 'SUCCESS',
          stats: directStats,
          errors: {
            users: directUsers.error?.message || null,
            balances: directBalances.error?.message || null,
            investments: directInvestments.error?.message || null,
            withdrawals: directWithdrawals.error?.message || null,
            deposits: directDeposits.error?.message || null
          }
        }
      },
      issues_identified: {
        api_endpoint_mismatches: [
          "Frontend components were calling /api/admin-v2/* but APIs are at /api/admin/*",
          "Dashboard stats API response structure mismatch with frontend expectations"
        ],
        potential_auth_issues: [
          dashboardStats?.error ? "Dashboard stats API authentication/authorization" : null,
          usersData?.error ? "Users API authentication/authorization" : null,
          withdrawalsData?.error ? "Withdrawals API authentication/authorization" : null
        ].filter(Boolean),
        data_display_issues: [
          "Frontend components not properly mapping API response data",
          "Missing error handling for failed API calls",
          "Hardcoded values in some components instead of using API data"
        ]
      },
      recommendations: [
        "Update all admin frontend components to use correct API endpoints (/api/admin/*)",
        "Fix API response mapping in frontend components",
        "Add proper error handling and loading states",
        "Implement proper admin authentication flow",
        "Add responsive design improvements for mobile devices"
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test admin panel error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
