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

    console.log('🔧 FORCE fixing all investment timestamps...');

    // Get ALL user investments regardless of their current timestamp format
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

    console.log(`Found ${investments?.length || 0} investments to FORCE fix`);

    let fixedCount = 0;
    const fixedInvestments = [];
    const times = [
      { hour: 10, minute: 0 },   // 10:00 AM PKT
      { hour: 11, minute: 15 },  // 11:15 AM PKT
      { hour: 14, minute: 30 },  // 2:30 PM PKT
      { hour: 15, minute: 45 },  // 3:45 PM PKT
      { hour: 16, minute: 20 },  // 4:20 PM PKT
      { hour: 17, minute: 10 }   // 5:10 PM PKT
    ];

    for (let i = 0; i < (investments || []).length; i++) {
      const investment = investments[i];
      
      console.log(`FORCE fixing investment ${investment.id} (${i + 1}/${investments.length})`);
      
      // Get the time for this investment
      const timeIndex = i % times.length;
      const { hour: pktHour, minute: pktMinute } = times[timeIndex];
      
      // Convert PKT to UTC (PKT = UTC+5)
      const utcHour = pktHour - 5;
      const finalUtcHour = utcHour >= 0 ? utcHour : utcHour + 24;
      
      // Create new timestamps with the assigned time
      const startDate = new Date(investment.start_date);
      const endDate = new Date(investment.end_date);
      
      // Force set the time components
      const newStartDate = new Date(startDate);
      newStartDate.setUTCHours(finalUtcHour, pktMinute, 0, 0);
      
      const newEndDate = new Date(endDate);
      newEndDate.setUTCHours(finalUtcHour, pktMinute, 0, 0);
      
      console.log(`Setting investment ${investment.id} to ${pktHour}:${pktMinute.toString().padStart(2, '0')} PKT`);
      console.log(`UTC times: ${newStartDate.toISOString()} to ${newEndDate.toISOString()}`);
      
      // Update the investment with FORCED timestamps
      const { error: updateError } = await admin
        .from("user_investments")
        .update({
          start_date: newStartDate.toISOString(),
          end_date: newEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", investment.id);
      
      if (updateError) {
        console.error(`Error updating investment ${investment.id}:`, updateError);
      } else {
        fixedCount++;
        fixedInvestments.push({
          id: investment.id,
          amount: investment.amount_invested,
          old_start: investment.start_date,
          old_end: investment.end_date,
          new_start: newStartDate.toISOString(),
          new_end: newEndDate.toISOString(),
          pkt_time: `${pktHour}:${pktMinute.toString().padStart(2, '0')}`,
          utc_hour: finalUtcHour
        });
        console.log(`✅ FORCE fixed investment ${investment.id} to ${pktHour}:${pktMinute.toString().padStart(2, '0')} PKT`);
      }
    }

    console.log(`✅ FORCE fix complete. Fixed ${fixedCount} investments`);

    return NextResponse.json({
      success: true,
      message: 'Investment timestamps FORCE fixed successfully',
      results: {
        total_investments: investments?.length || 0,
        fixed_investments: fixedCount,
        fixed_details: fixedInvestments
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('FORCE fix error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
