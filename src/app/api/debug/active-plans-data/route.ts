import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get data using regular client (what active plans page was using)
    const { data: userClientData, error: userError } = await supabase
      .from("user_investments")
      .select(`
        id,
        plan_id,
        amount_invested,
        daily_earning,
        total_earned,
        start_date,
        end_date,
        active,
        plans!inner (
          name,
          min_amount,
          daily_roi_percentage,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    // Get data using admin client (what should work)
    const { data: adminClientData, error: adminError } = await admin
      .from("user_investments")
      .select(`
        id,
        plan_id,
        amount_invested,
        daily_earning,
        total_earned,
        start_date,
        end_date,
        active,
        plans!inner (
          name,
          min_amount,
          daily_roi_percentage,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      user_client_data: {
        data: userClientData,
        error: userError,
        count: userClientData?.length || 0
      },
      admin_client_data: {
        data: adminClientData,
        error: adminError,
        count: adminClientData?.length || 0
      },
      comparison: {
        same_count: (userClientData?.length || 0) === (adminClientData?.length || 0),
        user_total_earned: userClientData?.reduce((sum, sub) => sum + (Number(sub.total_earned) || 0), 0) || 0,
        admin_total_earned: adminClientData?.reduce((sum, sub) => sum + (Number(sub.total_earned) || 0), 0) || 0
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
