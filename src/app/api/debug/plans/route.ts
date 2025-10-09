import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get all plans
    const { data: plans, error } = await admin
      .from("investment_plans")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json({ error: "Database error", details: error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: plans?.length || 0,
      plans: plans || []
    });

  } catch (error) {
    console.error("Debug plans API error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
