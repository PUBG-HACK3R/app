import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get pending deposits from deposit_transactions table
    const { data: pendingDeposits, error: depositError } = await admin
      .from("deposit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (depositError) {
      console.error("Error fetching pending deposits:", depositError);
      return NextResponse.json({ 
        pendingDeposits: [],
        error: "Failed to fetch pending deposits" 
      });
    }

    // Check for deposits older than 2 hours and mark them as failed
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const expiredDeposits = pendingDeposits?.filter(deposit => 
      deposit.status === "pending" && deposit.created_at < twoHoursAgo
    ) || [];

    // Auto-cancel expired deposits
    if (expiredDeposits.length > 0) {
      const expiredIds = expiredDeposits.map(d => d.id);
      
      await admin
        .from("deposit_transactions")
        .update({ 
          status: "failed",
          failure_reason: "Timeout - No payment received within 2 hours"
        })
        .in("id", expiredIds);

      // Remove expired deposits from the response
      const activePendingDeposits = pendingDeposits?.filter(deposit => 
        !expiredIds.includes(deposit.id)
      ) || [];

      return NextResponse.json({
        pendingDeposits: activePendingDeposits,
        expiredCount: expiredDeposits.length
      });
    }

    return NextResponse.json({
      pendingDeposits: pendingDeposits || [],
      expiredCount: 0
    });

  } catch (error) {
    console.error("Pending deposits API error:", error);
    return NextResponse.json(
      { error: "Internal server error", pendingDeposits: [] },
      { status: 500 }
    );
  }
}
