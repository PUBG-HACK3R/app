import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { confirm } = await request.json();
    
    if (confirm !== 'RESET_FOR_PRODUCTION') {
      return NextResponse.json({
        success: false,
        error: 'Invalid confirmation. Use "RESET_FOR_PRODUCTION" to confirm.'
      }, { status: 400 });
    }

    console.log('🚨 PRODUCTION RESET INITIATED');
    
    // Step 1: Clear all user-related data
    const clearOperations = [
      { table: 'transaction_logs', description: 'Transaction logs' },
      { table: 'referral_commissions', description: 'Referral commissions' },
      { table: 'daily_earnings', description: 'Daily earnings' },
      { table: 'user_investments', description: 'User investments' },
      { table: 'withdrawals', description: 'Withdrawals' },
      { table: 'deposits', description: 'Deposits' },
      { table: 'user_balances', description: 'User balances' },
      { table: 'user_profiles', description: 'User profiles' },
      { table: 'admin_users', description: 'Admin users' }
    ];

    const clearResults = [];
    
    for (const operation of clearOperations) {
      try {
        const { count, error } = await supabase
          .from(operation.table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (error) {
          console.error(`Error clearing ${operation.table}:`, error);
          clearResults.push({
            table: operation.table,
            success: false,
            error: error.message
          });
        } else {
          console.log(`✅ Cleared ${operation.description}: ${count || 0} records`);
          clearResults.push({
            table: operation.table,
            success: true,
            recordsCleared: count || 0
          });
        }
      } catch (err) {
        console.error(`Exception clearing ${operation.table}:`, err);
        clearResults.push({
          table: operation.table,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Step 2: Create fresh production admin user
    const adminPassword = '$2b$12$LQv3c1yqBwEHXw17kSHnu.1q/4.L5Xkz7mXAaH8kNuFNiagCh8WLO'; // WeEarn2024!
    
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        username: 'admin',
        email: 'admin@weearn.com',
        password_hash: adminPassword,
        full_name: 'Production Administrator',
        role: 'super_admin',
        permissions: ["read", "write", "delete", "manage_users", "manage_plans", "manage_withdrawals", "view_analytics", "system_admin"],
        is_active: true
      })
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin user:', adminError);
    } else {
      console.log('✅ Created production admin user');
    }

    // Step 3: Verify investment plans are intact
    const { data: plans, error: plansError } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('is_active', true);

    if (plansError) {
      console.error('Error checking investment plans:', plansError);
    }

    // Step 4: Get final verification counts
    const verificationTables = [
      'user_profiles', 'user_balances', 'deposits', 'user_investments',
      'daily_earnings', 'withdrawals', 'referral_commissions', 'transaction_logs'
    ];

    const finalCounts = {};
    for (const table of verificationTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          finalCounts[table] = count || 0;
        }
      } catch (err) {
        finalCounts[table] = 'Error';
      }
    }

    // Step 5: Check admin users count
    const { count: adminCount } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const response = {
      success: true,
      message: 'Production database reset completed successfully',
      timestamp: new Date().toISOString(),
      results: {
        clearOperations: clearResults,
        adminUserCreated: !adminError,
        adminError: adminError?.message || null,
        investmentPlansCount: plans?.length || 0,
        investmentPlans: plans || [],
        finalCounts: {
          ...finalCounts,
          admin_users: adminCount || 0,
          investment_plans: plans?.length || 0
        }
      },
      warnings: [
        '⚠️ All test user data has been permanently deleted',
        '⚠️ Admin login: username=admin, password=WeEarn2024! (CHANGE IMMEDIATELY)',
        '⚠️ You may need to manually delete auth.users from Supabase dashboard',
        '⚠️ Verify all systems work with clean database before going live'
      ]
    };

    console.log('🎉 PRODUCTION RESET COMPLETED');
    console.log('Admin credentials: admin / WeEarn2024!');
    console.log('Investment plans available:', plans?.length || 0);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Production reset failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Production reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get current database state for verification
    const tables = [
      'user_profiles', 'user_balances', 'deposits', 'user_investments',
      'daily_earnings', 'withdrawals', 'referral_commissions', 'transaction_logs',
      'investment_plans', 'admin_users'
    ];

    const currentState = {};
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          currentState[table] = count || 0;
        } else {
          currentState[table] = `Error: ${error.message}`;
        }
      } catch (err) {
        currentState[table] = 'Access Error';
      }
    }

    // Get investment plans details
    const { data: plans } = await supabase
      .from('investment_plans')
      .select('name, min_amount, max_amount, daily_roi_percentage, duration_days, payout_type, is_active')
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      message: 'Current database state',
      currentState,
      investmentPlans: plans || [],
      readyForReset: true,
      resetInstructions: {
        endpoint: 'POST /api/admin/production-reset',
        payload: { confirm: 'RESET_FOR_PRODUCTION' },
        warning: 'This will permanently delete ALL user data!'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get database state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
