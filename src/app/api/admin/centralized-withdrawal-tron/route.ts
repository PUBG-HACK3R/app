import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js';
const TronWeb = require('tronweb');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RPC_URL = process.env.RPC_URL!;
const HOT_PRIVATE_KEY = process.env.HOT_PRIVATE_KEY!;
const USDT_ADDRESS = process.env.USDT_ADDRESS!; // TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { withdrawal_id, action } = await request.json();

    if (!withdrawal_id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get withdrawal details
    const { data: withdrawal, error: withdrawalError } = await serviceSupabase
      .from('centralized_withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    if (action === 'approve') {
      // Approve and process TRON withdrawal
      try {
        console.log(`Processing TRON withdrawal: ${withdrawal.net_amount} USDT to ${withdrawal.to_address}`);

        // Initialize TronWeb
        const tronWeb = new TronWeb({
          fullHost: RPC_URL,
          privateKey: HOT_PRIVATE_KEY
        });

        // Get USDT contract instance
        const contract = await tronWeb.contract().at(USDT_ADDRESS);

        // Check main wallet balance
        const balance = await contract.balanceOf(tronWeb.defaultAddress.base58).call();
        const balanceInUsdt = parseFloat(tronWeb.fromSun(balance)) / 1000000; // Convert from sun and adjust for 6 decimals

        if (balanceInUsdt < withdrawal.net_amount) {
          return NextResponse.json({ 
            error: `Insufficient balance. Available: ${balanceInUsdt} USDT, Required: ${withdrawal.net_amount} USDT` 
          }, { status: 400 });
        }

        // Update status to processing
        await serviceSupabase
          .from('centralized_withdrawals')
          .update({
            status: 'processing',
            admin_id: user.id,
            approved_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
          })
          .eq('id', withdrawal_id);

        // Send USDT TRC20 transaction
        const transferAmount = Math.floor(withdrawal.net_amount * 1000000); // Convert to smallest unit (6 decimals)
        
        const transferTx = await contract.transfer(
          withdrawal.to_address,
          transferAmount
        ).send();
        
        console.log(`TRON withdrawal transaction sent: ${transferTx}`);

        // Wait a moment for transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get transaction info
        const txInfo = await tronWeb.trx.getTransactionInfo(transferTx);

        if (txInfo && txInfo.result === 'SUCCESS') {
          // Transaction successful
          await serviceSupabase
            .from('centralized_withdrawals')
            .update({
              status: 'completed',
              tx_hash: transferTx,
              completed_at: new Date().toISOString(),
              gas_used: txInfo.fee ? txInfo.fee.toString() : '0'
            })
            .eq('id', withdrawal_id);

          // Create withdrawal transaction record
          await serviceSupabase
            .from('transactions')
            .insert({
              user_id: withdrawal.user_id,
              type: 'withdrawal',
              amount_usdt: -withdrawal.amount, // Negative for withdrawal
              reference_id: withdrawal_id,
              meta: {
                source: 'centralized_withdrawal_tron',
                to_address: withdrawal.to_address,
                tx_hash: transferTx,
                fee_amount: withdrawal.fee_amount,
                net_amount: withdrawal.net_amount,
                admin_id: user.id,
                network: 'tron',
                gas_fee: txInfo.fee ? txInfo.fee.toString() : '0'
              }
            });

          return NextResponse.json({
            success: true,
            message: "TRON withdrawal completed successfully",
            tx_hash: transferTx,
            network: 'tron',
            gas_fee: txInfo.fee ? txInfo.fee.toString() : '0'
          });

        } else {
          // Transaction failed
          await serviceSupabase
            .from('centralized_withdrawals')
            .update({
              status: 'failed',
              rejection_reason: 'TRON transaction failed'
            })
            .eq('id', withdrawal_id);

          return NextResponse.json({ 
            error: "TRON transaction failed" 
          }, { status: 500 });
        }

      } catch (blockchainError) {
        console.error('TRON blockchain error:', blockchainError);

        // Update withdrawal status to failed
        await serviceSupabase
          .from('centralized_withdrawals')
          .update({
            status: 'failed',
            rejection_reason: `TRON error: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`
          })
          .eq('id', withdrawal_id);

        return NextResponse.json({ 
          error: `TRON error: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}` 
        }, { status: 500 });
      }

    } else if (action === 'reject') {
      const { reason } = await request.json();

      // Reject withdrawal
      await serviceSupabase
        .from('centralized_withdrawals')
        .update({
          status: 'rejected',
          admin_id: user.id,
          rejection_reason: reason || 'Rejected by admin',
          approved_at: new Date().toISOString()
        })
        .eq('id', withdrawal_id);

      return NextResponse.json({
        success: true,
        message: "Withdrawal rejected successfully"
      });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error('TRON centralized withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
