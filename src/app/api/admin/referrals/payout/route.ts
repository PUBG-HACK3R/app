import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pay out referral commissions (admin only)
export async function POST(request: Request) {
  try {
    const { commissionIds } = await request.json();
    
    if (!commissionIds || !Array.isArray(commissionIds)) {
      return NextResponse.json({ error: "Commission IDs array is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdminClient();

    // Get commission details
    const { data: commissions, error: fetchError } = await admin
      .from("referral_commissions")
      .select("*")
      .in("id", commissionIds)
      .eq("status", "pending");

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    if (!commissions || commissions.length === 0) {
      return NextResponse.json({ error: "No pending commissions found" }, { status: 404 });
    }

    const results = [];

    // Process each commission
    for (const commission of commissions) {
      try {
        // Create deposit transaction for the referrer
        const { data: transaction, error: txError } = await admin
          .from("transaction_logs")
          .insert({
            user_id: commission.referrer_user_id,
            type: "deposit",
            amount_usdt: commission.commission_amount,
            reference_id: commission.id,
            meta: {
              type: "referral_commission",
              commission_id: commission.id,
              referred_user_id: commission.referred_user_id,
              source_type: commission.source_type,
              source_amount: commission.source_amount,
              admin_payout: true,
              admin_id: user.id,
              payout_date: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (txError) {
          results.push({
            commission_id: commission.id,
            success: false,
            error: txError.message
          });
          continue;
        }

        // Update commission status to paid
        const { error: updateError } = await admin
          .from("referral_commissions")
          .update({ status: "paid" })
          .eq("id", commission.id);

        if (updateError) {
          results.push({
            commission_id: commission.id,
            success: false,
            error: updateError.message
          });
          continue;
        }

        // Update referrer's balance
        const { data: balRow } = await admin
          .from("user_balances")
          .select("available_balance")
          .eq("user_id", commission.referrer_user_id)
          .maybeSingle();

        if (!balRow) {
          await admin.from("user_balances").insert({
            user_id: commission.referrer_user_id,
            available_balance: commission.commission_amount,
          });
        } else {
          const newBal = Number(balRow.available_balance || 0) + Number(commission.commission_amount);
          await admin
            .from("user_balances")
            .update({ available_balance: newBal })
            .eq("user_id", commission.referrer_user_id);
        }

        results.push({
          commission_id: commission.id,
          success: true,
          amount: commission.commission_amount,
          referrer_user_id: commission.referrer_user_id
        });
      } catch (err: any) {
        results.push({
          commission_id: commission.id,
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalAmount = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Paid out ${successCount} commissions totaling $${totalAmount.toFixed(2)}`,
      results,
      summary: {
        total_processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        total_amount: totalAmount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
