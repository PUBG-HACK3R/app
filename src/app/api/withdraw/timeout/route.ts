import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { withdrawalId } = await request.json();
    
    if (!withdrawalId) {
      return NextResponse.json({ error: "Withdrawal ID is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get the withdrawal and verify it belongs to the user
    const { data: withdrawal, error: fetchError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    // Check if withdrawal has expired
    const now = new Date();
    const expiresAt = new Date(withdrawal.expires_at);
    
    if (now < expiresAt) {
      return NextResponse.json({ error: "Withdrawal has not expired yet" }, { status: 400 });
    }

    // Check if withdrawal is still pending
    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: "Withdrawal is no longer pending" }, { status: 400 });
    }

    // Update withdrawal status to timeout
    const { error: updateError } = await supabase
      .from("withdrawals")
      .update({
        status: "timeout",
        timeout_reason: "Processing timeout - blockchain confirmation failed. Please try again.",
        updated_at: now.toISOString()
      })
      .eq("id", withdrawalId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Withdrawal timed out due to blockchain processing delay",
      status: "timeout"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}

// Get withdrawal status and time remaining
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const withdrawalId = searchParams.get("id");
    
    if (!withdrawalId) {
      return NextResponse.json({ error: "Withdrawal ID is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get the withdrawal
    const { data: withdrawal, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .eq("user_id", user.id)
      .single();

    if (error || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(withdrawal.expires_at);
    const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
    const hasExpired = timeRemaining === 0;

    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        status: withdrawal.status,
        amount_usdt: withdrawal.amount_usdt,
        fee_usdt: withdrawal.fee_usdt,
        net_amount_usdt: withdrawal.net_amount_usdt,
        address: withdrawal.address,
        expires_at: withdrawal.expires_at,
        created_at: withdrawal.created_at,
        processing_started_at: withdrawal.processing_started_at,
        timeout_reason: withdrawal.timeout_reason
      },
      timeRemaining,
      hasExpired,
      minutesRemaining: Math.ceil(timeRemaining / (1000 * 60))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
