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

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get the withdrawal
    const { data: withdrawal, error: fetchError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    // Check if withdrawal is still pending and not expired
    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: "Withdrawal is no longer pending" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(withdrawal.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json({ error: "Withdrawal has expired" }, { status: 400 });
    }

    // Update withdrawal status to processing
    const { error: updateError } = await supabase
      .from("withdrawals")
      .update({
        status: "processing",
        processing_started_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq("id", withdrawalId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Withdrawal processing started",
      status: "processing"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
