import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get all withdrawals without any joins
    const { data: withdrawals, error } = await admin
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawals:", error);
      return NextResponse.json({ 
        error: "Failed to fetch withdrawals", 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`Direct query found ${withdrawals?.length || 0} withdrawals`);
    
    // Also check user_profiles table
    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles")
      .select("user_id, email")
      .limit(5);

    return NextResponse.json({
      withdrawals_count: withdrawals?.length || 0,
      withdrawals: withdrawals || [],
      profiles_sample: profiles || [],
      profiles_error: profilesError?.message || null
    });

  } catch (error: any) {
    console.error("Test withdrawals error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
