import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔧 DIRECT SQL FIX - Using investment_time for start_date and adding duration_days for end_date');

    // Direct SQL update - exactly what you said
    const { data: result, error: updateError } = await admin.rpc('update_investment_timestamps', {
      target_user_id: user.id
    });

    // If RPC doesn't exist, do it manually
    if (updateError && updateError.message?.includes('function')) {
      console.log('RPC not found, doing manual update...');
      
      // Get investments first
      const { data: investments, error: fetchError } = await admin
        .from("user_investments")
        .select("id, investment_time, duration_days")
        .eq("user_id", user.id);

      if (fetchError) {
        return NextResponse.json({ error: "Failed to fetch investments", details: fetchError.message }, { status: 500 });
      }

      console.log(`Found ${investments?.length || 0} investments to update`);

      let updated = 0;
      for (const inv of investments || []) {
        if (inv.investment_time) {
          const startDate = new Date(inv.investment_time);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (inv.duration_days || 1));

          const { error: updateErr } = await admin
            .from("user_investments")
            .update({
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            })
            .eq("id", inv.id);

          if (!updateErr) {
            updated++;
            console.log(`Updated investment ${inv.id}: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${updated} investments using investment_time + duration_days`,
        updated_count: updated,
        total_investments: investments?.length || 0
      });
    }

    if (updateError) {
      return NextResponse.json({ error: "Update failed", details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Investments updated using investment_time + duration_days",
      result: result
    });

  } catch (error: any) {
    console.error('Direct SQL fix error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
