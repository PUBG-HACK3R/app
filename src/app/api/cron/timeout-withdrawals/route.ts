import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Verify the request is from a cron job or has the correct secret
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.REVALIDATE_SECRET;
    
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();

    // Find all pending withdrawals that have expired
    const { data: expiredWithdrawals, error: fetchError } = await admin
      .from("withdrawals")
      .select("id, user_id, amount_usdt, expires_at")
      .eq("status", "pending")
      .not("expires_at", "is", null)
      .lt("expires_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching expired withdrawals:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredWithdrawals || expiredWithdrawals.length === 0) {
      return NextResponse.json({ 
        message: "No expired withdrawals found", 
        processed: 0 
      });
    }

    // Update all expired withdrawals to timeout status
    const { error: updateError } = await admin
      .from("withdrawals")
      .update({
        status: "timeout",
        timeout_reason: "Processing timeout - blockchain confirmation failed. Please try again.",
        updated_at: now.toISOString()
      })
      .in("id", expiredWithdrawals.map(w => w.id));

    if (updateError) {
      console.error("Error updating expired withdrawals:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`Processed ${expiredWithdrawals.length} expired withdrawals`);

    return NextResponse.json({
      message: "Successfully processed expired withdrawals",
      processed: expiredWithdrawals.length,
      withdrawals: expiredWithdrawals.map(w => ({
        id: w.id,
        user_id: w.user_id,
        amount: w.amount_usdt,
        expired_at: w.expires_at
      }))
    });

  } catch (error: any) {
    console.error("Timeout withdrawals cron error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}

// Also allow GET for manual testing
export async function GET(request: Request) {
  return POST(request);
}
