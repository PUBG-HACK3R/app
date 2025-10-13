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

    // Get user's profile
    const { data: userProfile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get users referred BY this user (people who have referred_by = this user's ID)
    const { data: referredUsers, error: referredError } = await admin
      .from("user_profiles")
      .select("user_id, email, created_at, referred_by")
      .eq("referred_by", user.id);

    // Get referral commissions for this user
    const { data: commissions, error: commissionsError } = await admin
      .from("referral_commissions")
      .select("*")
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    // Get transaction logs for referral commissions
    const { data: referralTransactions, error: txError } = await admin
      .from("transaction_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "referral_commission")
      .order("created_at", { ascending: false });

    // Check if there are any users who have this user as referred_by but no commission record
    const missingCommissions = [];
    for (const referredUser of referredUsers || []) {
      const hasCommission = (commissions || []).some(c => c.referred_user_id === referredUser.user_id);
      if (!hasCommission) {
        missingCommissions.push(referredUser);
      }
    }

    // Calculate totals
    const totalReferrals = referredUsers?.length || 0;
    const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;
    const paidCommissions = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;
    const pendingCommissions = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        user_profile: userProfile,
        referral_analysis: {
          total_referrals: totalReferrals,
          total_commissions: totalCommissions,
          paid_commissions: paidCommissions,
          pending_commissions: pendingCommissions,
          missing_commission_records: missingCommissions.length
        },
        referred_users: referredUsers?.map(u => ({
          user_id: u.user_id,
          email: u.email,
          created_at: u.created_at,
          has_commission_record: (commissions || []).some(c => c.referred_user_id === u.user_id)
        })) || [],
        commission_records: commissions?.map(c => ({
          id: c.id,
          referred_user_id: c.referred_user_id,
          commission_amount: c.commission_amount,
          status: c.status,
          source_type: c.source_type,
          created_at: c.created_at
        })) || [],
        referral_transactions: referralTransactions?.map(tx => ({
          id: tx.id,
          amount_usdt: tx.amount_usdt,
          description: tx.description,
          created_at: tx.created_at,
          balance_before: tx.balance_before,
          balance_after: tx.balance_after
        })) || [],
        issues_found: {
          missing_commission_records: missingCommissions,
          commission_transaction_mismatch: (commissions?.length || 0) !== (referralTransactions?.length || 0)
        }
      }
    });

  } catch (error: any) {
    console.error('Check referral data error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
