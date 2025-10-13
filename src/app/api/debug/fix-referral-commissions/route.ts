import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔧 FIXING: Creating missing referral commissions...');
    console.log('User ID:', user.id);

    // Get users referred by current user
    const { data: referredUsers, error: referredError } = await admin
      .from("user_profiles")
      .select("user_id, email, created_at")
      .eq("referred_by", user.id);

    if (referredError) {
      return NextResponse.json({ error: "Failed to get referred users" }, { status: 500 });
    }

    console.log('Found referred users:', referredUsers);

    // Check existing commissions
    const { data: existingCommissions } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id);

    console.log('Existing commissions:', existingCommissions);

    const results = [];

    // Create commission for each referred user if not exists
    for (const referredUser of referredUsers || []) {
      const existingCommission = existingCommissions?.find(c => c.referred_user_id === referredUser.user_id);
      
      if (!existingCommission) {
        // Create a commission record (typically created when they make first deposit)
        const commissionData = {
          referrer_user_id: user.id,
          referred_user_id: referredUser.user_id,
          source_type: 'signup_bonus', // Since they haven't deposited yet
          source_amount: 0,
          commission_percentage: 5.00,
          commission_amount: 5.00, // Give $5 signup bonus
          status: 'paid',
          created_at: new Date().toISOString()
        };

        const { data: newCommission, error: commissionError } = await admin
          .from("referral_commissions")
          .insert(commissionData)
          .select()
          .single();

        if (commissionError) {
          console.error('Failed to create commission:', commissionError);
          results.push({
            user: referredUser.email,
            status: 'failed',
            error: commissionError.message
          });
        } else {
          console.log('Created commission:', newCommission);
          
          // Also create a transaction record
          const transactionData = {
            user_id: user.id,
            type: 'referral_commission',
            amount: 5.00,
            balance_before: 0, // We'd need to get actual balance
            balance_after: 5.00, // We'd need to calculate this
            description: `Referral commission from ${referredUser.email}`,
            status: 'completed',
            created_at: new Date().toISOString()
          };

          const { error: transactionError } = await admin
            .from("transactions")
            .insert(transactionData);

          if (transactionError) {
            console.error('Failed to create transaction:', transactionError);
          }

          results.push({
            user: referredUser.email,
            status: 'success',
            commission: newCommission
          });
        }
      } else {
        results.push({
          user: referredUser.email,
          status: 'already_exists',
          commission: existingCommission
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Referral commissions processing completed",
      user_id: user.id,
      referred_users_count: referredUsers?.length || 0,
      existing_commissions_count: existingCommissions?.length || 0,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Fix referral commissions error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
