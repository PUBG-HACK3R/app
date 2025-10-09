import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const token = request.headers.get('cookie')?.split('admin_token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: "Admin authentication required" 
      }, { status: 401 });
    }

    const adminUser = await adminAuth.verifyToken(token);
    if (!adminUser) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid admin token" 
      }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // Get all users with their profiles, balances, and stats
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
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
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ 
        success: false,
        error: "Failed to fetch users" 
      }, { status: 500 });
    }

    // Get investment counts for each user
    const { data: investments } = await supabase
      .from('user_investments')
      .select('user_id, status, amount_invested, total_earned');

    // Get recent transactions for each user
    const { data: transactions } = await supabase
      .from('transaction_logs')
      .select('user_id, type, amount_usdt, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    // Process user data
    const processedUsers = (users || []).map((user: any) => {
      const userInvestments = (investments || []).filter((inv: any) => inv.user_id === user.user_id);
      const userTransactions = (transactions || []).filter((tx: any) => tx.user_id === user.user_id);
      
      return {
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
        created_at: user.created_at,
        
        // Balance information
        balance: user.user_balances?.[0] || {
          available_balance: 0,
          locked_balance: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          total_earned: 0
        },
        
        // Investment stats
        investments: {
          active: userInvestments.filter((inv: any) => inv.status === 'active').length,
          completed: userInvestments.filter((inv: any) => inv.status === 'completed').length,
          locked_balance: userInvestments.reduce((sum: number, inv: any) => sum + Number(inv.amount_invested || 0), 0),
          total_earned: userInvestments.reduce((sum: number, inv: any) => sum + Number(inv.total_earned || 0), 0)
        },
        
        // Recent activity
        last_transaction: userTransactions[0] || null,
        transaction_count: userTransactions.length
      };
    });

    return NextResponse.json({
      success: true,
      users: processedUsers,
      summary: {
        total_users: processedUsers.length,
        total_balance: processedUsers.reduce((sum: number, user: any) => 
          sum + Number(user.balance.available_balance || 0) + Number(user.balance.locked_balance || 0), 0),
        total_deposited: processedUsers.reduce((sum: number, user: any) => 
          sum + Number(user.balance.total_deposited || 0), 0),
        active_investors: processedUsers.filter((user: any) => user.investments.active > 0).length
      }
    });

  } catch (error) {
    console.error("Admin users API error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 });
  }
}
