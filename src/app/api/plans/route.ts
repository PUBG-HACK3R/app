import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// GET - Fetch active plans (public endpoint)
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Fetch only active plans
    const { data: plans, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("min_amount", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (error) {
    console.error("Plans GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
