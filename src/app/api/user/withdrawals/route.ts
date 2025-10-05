import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    // Use admin client to fetch user's withdrawals
    const adminClient = getSupabaseAdminClient();
    const { data: withdrawals, error: withdrawalError } = await adminClient
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (withdrawalError) {
      console.error("Error fetching withdrawals:", withdrawalError);
      return NextResponse.json({ 
        error: "Failed to fetch withdrawals" 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    });
  } catch (error: any) {
    console.error("Withdrawals API error:", error);
    return NextResponse.json({ 
      error: error.message || "Unexpected error" 
    }, { status: 500 });
  }
}
