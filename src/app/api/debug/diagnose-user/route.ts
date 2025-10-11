import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated",
        auth_error: authError?.message,
        user: null
      }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔍 DIAGNOSING USER AND INVESTMENTS...');
    console.log('Current user ID:', user.id);
    console.log('Current user email:', user.email);

    // Get ALL investments in the database (not filtered by user)
    const { data: allInvestments, error: allError } = await admin
      .from("user_investments")
      .select("*")
      .limit(20);

    // Get investments for this specific user
    const { data: userInvestments, error: userError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id);

    // Get user profile
    const { data: userProfile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get user balance
    const { data: userBalance, error: balanceError } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .single();

    console.log('All investments count:', allInvestments?.length || 0);
    console.log('User investments count:', userInvestments?.length || 0);
    console.log('User profile:', userProfile);
    console.log('User balance:', userBalance);

    // Check if there are investments with similar email
    let investmentsByEmail = [];
    if (user.email) {
      const { data: profilesByEmail } = await admin
        .from("user_profiles")
        .select("user_id")
        .eq("email", user.email);

      if (profilesByEmail && profilesByEmail.length > 0) {
        const userIds = profilesByEmail.map(p => p.user_id);
        const { data: investmentsByEmailData } = await admin
          .from("user_investments")
          .select("*")
          .in("user_id", userIds);
        
        investmentsByEmail = investmentsByEmailData || [];
      }
    }

    return NextResponse.json({
      success: true,
      diagnosis: {
        current_user: {
          id: user.id,
          email: user.email,
          authenticated: true
        },
        database_status: {
          all_investments_count: allInvestments?.length || 0,
          user_investments_count: userInvestments?.length || 0,
          investments_by_email_count: investmentsByEmail.length,
          user_profile_exists: !!userProfile,
          user_balance_exists: !!userBalance
        },
        sample_investments: allInvestments?.slice(0, 5).map(inv => ({
          id: inv.id,
          user_id: inv.user_id,
          amount: inv.amount_invested,
          start_date: inv.start_date,
          end_date: inv.end_date,
          investment_time: inv.investment_time,
          created_at: inv.created_at
        })) || [],
        user_investments: userInvestments?.map(inv => ({
          id: inv.id,
          amount: inv.amount_invested,
          start_date: inv.start_date,
          end_date: inv.end_date,
          investment_time: inv.investment_time,
          created_at: inv.created_at,
          status: inv.status
        })) || [],
        investments_by_email: investmentsByEmail.map(inv => ({
          id: inv.id,
          user_id: inv.user_id,
          amount: inv.amount_invested,
          start_date: inv.start_date,
          end_date: inv.end_date,
          investment_time: inv.investment_time
        })),
        errors: {
          all_investments_error: allError?.message,
          user_investments_error: userError?.message,
          profile_error: profileError?.message,
          balance_error: balanceError?.message
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
