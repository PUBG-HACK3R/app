import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RPC_URL = process.env.RPC_URL!;
const HOT_PRIVATE_KEY = process.env.HOT_PRIVATE_KEY!;
const USDT_ADDRESS = process.env.USDT_ADDRESS!;

// USDT Contract ABI
const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

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
      // Approve and process withdrawal
      try {
        console.log(`Processing withdrawal: ${withdrawal.net_amount} USDT to ${withdrawal.to_address}`);

        // Initialize blockchain connection
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(HOT_PRIVATE_KEY, provider);
        const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);

        // Check main wallet balance
        const balance = await usdtContract.balanceOf(wallet.address);
        const balanceInUsdt = parseFloat(ethers.formatUnits(balance, 6));

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

        // Send USDT transaction
        const transferAmount = ethers.parseUnits(withdrawal.net_amount.toString(), 6);
        const transferTx = await usdtContract.transfer(withdrawal.to_address, transferAmount);
        
        console.log(`Withdrawal transaction sent: ${transferTx.hash}`);

        // Wait for transaction confirmation
        const receipt = await transferTx.wait();

        if (receipt && receipt.status === 1) {
          // Transaction successful
          await serviceSupabase
            .from('centralized_withdrawals')
            .update({
              status: 'completed',
              tx_hash: transferTx.hash,
              completed_at: new Date().toISOString(),
              gas_used: receipt.gasUsed.toString(),
              gas_price: transferTx.gasPrice?.toString() || '0'
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
                source: 'centralized_withdrawal',
                to_address: withdrawal.to_address,
                tx_hash: transferTx.hash,
                fee_amount: withdrawal.fee_amount,
                net_amount: withdrawal.net_amount,
                admin_id: user.id,
                gas_used: receipt.gasUsed.toString(),
                gas_price: transferTx.gasPrice?.toString() || '0'
              }
            });

          return NextResponse.json({
            success: true,
            message: "Withdrawal completed successfully",
            tx_hash: transferTx.hash,
            gas_used: receipt.gasUsed.toString()
          });

        } else {
          // Transaction failed
          await serviceSupabase
            .from('centralized_withdrawals')
            .update({
              status: 'failed',
              rejection_reason: 'Blockchain transaction failed'
            })
            .eq('id', withdrawal_id);

          return NextResponse.json({ 
            error: "Blockchain transaction failed" 
          }, { status: 500 });
        }

      } catch (blockchainError) {
        console.error('Blockchain error:', blockchainError);

        // Update withdrawal status to failed
        await serviceSupabase
          .from('centralized_withdrawals')
          .update({
            status: 'failed',
            rejection_reason: `Blockchain error: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`
          })
          .eq('id', withdrawal_id);

        return NextResponse.json({ 
          error: `Blockchain error: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}` 
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
    console.error('Centralized withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
