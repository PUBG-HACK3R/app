import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateWithdrawalSchema = z.object({
  withdrawal_id: z.string().uuid(),
  status: z.enum(['approved', 'rejected', 'completed']),
  admin_notes: z.string().optional(),
  tx_hash: z.string().optional()
});

// GET - Fetch all withdrawals
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

    // Get all withdrawals with user information
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select(`
        *,
        user_profiles (
          email,
          full_name,
          referral_code
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return NextResponse.json({ 
        success: false,
        error: "Failed to fetch withdrawals" 
      }, { status: 500 });
    }

    // Calculate summary statistics
    const summary = {
      total_withdrawals: withdrawals?.length || 0,
      pending_count: withdrawals?.filter(w => w.status === 'pending').length || 0,
      approved_count: withdrawals?.filter(w => w.status === 'approved').length || 0,
      completed_count: withdrawals?.filter(w => w.status === 'completed').length || 0,
      rejected_count: withdrawals?.filter(w => w.status === 'rejected').length || 0,
      expired_count: withdrawals?.filter(w => w.status === 'expired').length || 0,
      total_amount: withdrawals?.reduce((sum, w) => sum + Number(w.amount_usdt || 0), 0) || 0,
      pending_amount: withdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount_usdt || 0), 0) || 0
    };

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
      summary
    });

  } catch (error) {
    console.error("Admin withdrawals GET error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// POST - Update withdrawal status
export async function POST(request: Request) {
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

    const json = await request.json();
    const { withdrawal_id, status, admin_notes, tx_hash } = UpdateWithdrawalSchema.parse(json);

    const supabase = getSupabaseAdminClient();

    // Get the withdrawal first
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ 
        success: false,
        error: "Withdrawal not found" 
      }, { status: 404 });
    }

    // Update withdrawal status
    const updateData: any = {
      status,
      processed_at: new Date().toISOString()
    };

    if (admin_notes) updateData.admin_notes = admin_notes;
    if (tx_hash) updateData.tx_hash = tx_hash;

    const { error: updateError } = await supabase
      .from('withdrawals')
      .update(updateData)
      .eq('id', withdrawal_id);

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
      return NextResponse.json({ 
        success: false,
        error: "Failed to update withdrawal" 
      }, { status: 500 });
    }

    // If rejected, add the amount back to user's available balance
    if (status === 'rejected') {
      const { data: balance } = await supabase
        .from('user_balances')
        .select('available_balance')
        .eq('user_id', withdrawal.user_id)
        .single();

      if (balance) {
        await supabase
          .from('user_balances')
          .update({
            available_balance: balance.available_balance + withdrawal.amount_usdt
          })
          .eq('user_id', withdrawal.user_id);

        // Log the refund transaction
        await supabase
          .from('transaction_logs')
          .insert({
            user_id: withdrawal.user_id,
            type: 'withdrawal',
            amount_usdt: withdrawal.amount_usdt,
            description: `Withdrawal rejected - Amount refunded`,
            reference_id: withdrawal_id,
            balance_before: balance.available_balance,
            balance_after: balance.available_balance + withdrawal.amount_usdt
          });
      }
    }

    // If completed, deduct from user's available balance (if not already done)
    if (status === 'completed' && withdrawal.status === 'approved') {
      const { data: balance } = await supabase
        .from('user_balances')
        .select('available_balance, total_withdrawn')
        .eq('user_id', withdrawal.user_id)
        .single();

      if (balance) {
        await supabase
          .from('user_balances')
          .update({
            available_balance: Math.max(0, balance.available_balance - withdrawal.amount_usdt),
            total_withdrawn: balance.total_withdrawn + withdrawal.amount_usdt
          })
          .eq('user_id', withdrawal.user_id);

        // Log the withdrawal transaction
        await supabase
          .from('transaction_logs')
          .insert({
            user_id: withdrawal.user_id,
            type: 'withdrawal',
            amount_usdt: -withdrawal.amount_usdt,
            description: `Withdrawal completed - ${withdrawal.wallet_address}`,
            reference_id: withdrawal_id,
            balance_before: balance.available_balance,
            balance_after: Math.max(0, balance.available_balance - withdrawal.amount_usdt)
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal_id,
      status
    });

  } catch (err: any) {
    console.error("Admin withdrawal update error:", err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid request data", 
        issues: err.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Failed to update withdrawal" 
    }, { status: 500 });
  }
}
