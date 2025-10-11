import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔧 RAW DATABASE FIX - No conditions, just update everything...');

    // Get ALL user investments with raw data
    const { data: investments, error: fetchError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id);

    if (fetchError) {
      console.error('Error fetching investments:', fetchError);
      return NextResponse.json({ 
        error: "Failed to fetch investments", 
        details: fetchError.message 
      }, { status: 500 });
    }

    console.log(`RAW DATA: Found ${investments?.length || 0} investments`);
    
    // Log raw data for debugging
    investments?.forEach((inv, i) => {
      console.log(`Investment ${i + 1}:`, {
        id: inv.id,
        start_date: inv.start_date,
        end_date: inv.end_date,
        investment_time: inv.investment_time,
        created_at: inv.created_at,
        duration_days: inv.duration_days
      });
    });

    let fixedCount = 0;
    const fixedInvestments = [];

    // FORCE UPDATE EVERY SINGLE INVESTMENT
    for (let i = 0; i < (investments || []).length; i++) {
      const investment = investments[i];
      
      console.log(`FORCE UPDATING investment ${investment.id} (${i + 1}/${investments.length})`);
      
      // Determine the best timestamp to use
      let baseTime;
      if (investment.investment_time) {
        baseTime = new Date(investment.investment_time);
        console.log(`Using investment_time: ${investment.investment_time}`);
      } else if (investment.created_at) {
        baseTime = new Date(investment.created_at);
        console.log(`Using created_at: ${investment.created_at}`);
      } else {
        // Create a realistic time for this investment
        const now = new Date();
        baseTime = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // Each investment 2 hours apart
        console.log(`Using generated time: ${baseTime.toISOString()}`);
      }
      
      // Calculate end date
      const startDate = new Date(baseTime);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (investment.duration_days || 1));
      
      console.log(`FORCING update to: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
      
      // FORCE UPDATE - no conditions
      const { error: updateError } = await admin
        .from("user_investments")
        .update({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", investment.id);
      
      if (updateError) {
        console.error(`FORCE UPDATE ERROR for ${investment.id}:`, updateError);
      } else {
        fixedCount++;
        fixedInvestments.push({
          id: investment.id,
          amount: investment.amount_invested,
          old_start: investment.start_date,
          old_end: investment.end_date,
          new_start: startDate.toISOString(),
          new_end: endDate.toISOString(),
          pkt_start: startDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
          pkt_end: endDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
        });
        console.log(`✅ FORCE UPDATED investment ${investment.id}`);
      }
    }

    console.log(`✅ RAW DATABASE FIX complete. Updated ${fixedCount} investments`);

    return NextResponse.json({
      success: true,
      message: 'RAW DATABASE FIX - All investments force updated',
      results: {
        total_investments: investments?.length || 0,
        fixed_investments: fixedCount,
        fixed_details: fixedInvestments
      },
      raw_data: investments?.map(inv => ({
        id: inv.id,
        start_date: inv.start_date,
        end_date: inv.end_date,
        investment_time: inv.investment_time,
        created_at: inv.created_at
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('RAW DATABASE FIX error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
