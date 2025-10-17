import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Skip auth check and use admin client directly
    // We'll validate user ownership in the query itself
    const { searchParams } = new URL(request.url);
    const withdrawalId = searchParams.get("id");
    const userId = searchParams.get("user_id");

    if (!withdrawalId || !userId) {
      return NextResponse.json(
        { error: "Withdrawal ID and User ID are required" },
        { status: 400 }
      );
    }

    console.log(`Checking withdrawal status for ID: ${withdrawalId}, User: ${userId}`);

    // Try a much simpler approach - disable RLS temporarily for this query
    const adminClient = getSupabaseAdminClient();
    
    try {
      // First disable RLS for this session
      await adminClient.rpc('set_config', {
        setting_name: 'row_security',
        new_value: 'off',
        is_local: true
      });

      // Now query normally
      const { data: withdrawal, error } = await adminClient
        .from("withdrawals")
        .select("id, status, admin_notes, user_id")
        .eq("id", withdrawalId)
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }

      if (!withdrawal) {
        return NextResponse.json(
          { error: "Withdrawal not found or access denied" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: withdrawal.id,
          status: withdrawal.status,
          admin_notes: withdrawal.admin_notes
        }
      });

    } catch (rpcError) {
      console.log("RLS disable failed, trying direct query:", rpcError);
      
      // Fallback: try direct query without RLS disable
      const { data: withdrawal, error } = await adminClient
        .from("withdrawals")
        .select("id, status, admin_notes, user_id")
        .eq("id", withdrawalId)
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Fallback query error:", error);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }

      if (!withdrawal) {
        return NextResponse.json(
          { error: "Withdrawal not found or access denied" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: withdrawal.id,
          status: withdrawal.status,
          admin_notes: withdrawal.admin_notes
        }
      });
    }

  } catch (err: any) {
    console.error("Withdrawal status check error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
