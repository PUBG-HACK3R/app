import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/database/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WithdrawSchema = z.object({
  amount: z.number().positive().min(5, "Minimum withdrawal amount is $5"),
  wallet_address: z.string().min(10, "Invalid wallet address"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { amount, wallet_address } = WithdrawSchema.parse(json);
    
    // Validate minimum amount
    if (amount < 5) {
      return NextResponse.json({ 
        success: false,
        error: "Minimum withdrawal amount is $5" 
      }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Check user balance using clean database service
    const balance = await db.getUserBalance(user.id);
    if (!balance) {
      return NextResponse.json({ 
        success: false,
        error: "Balance not found" 
      }, { status: 404 });
    }

    if (balance.available_balance < amount) {
      return NextResponse.json({ 
        success: false,
        error: `Insufficient balance. Available: $${balance.available_balance.toFixed(2)}` 
      }, { status: 400 });
    }

    // Create withdrawal request using clean database service
    const withdrawal = await db.createWithdrawal(user.id, amount, wallet_address);
    
    if (!withdrawal) {
      return NextResponse.json({ 
        success: false,
        error: "Failed to create withdrawal request" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount_usdt,
        fee: withdrawal.fee_usdt,
        net_amount: withdrawal.net_amount_usdt,
        wallet_address: withdrawal.wallet_address,
        status: withdrawal.status,
        expires_at: withdrawal.expires_at,
        created_at: withdrawal.created_at
      }
    });

  } catch (err: any) {
    console.error("Withdrawal request error:", err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid request data", 
        issues: err.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: err.message || "Failed to process withdrawal request" 
    }, { status: 500 });
  }
}

