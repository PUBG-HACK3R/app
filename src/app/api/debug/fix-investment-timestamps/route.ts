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

    console.log('🔧 Starting investment timestamp fix...');

    // Get all user investments that have date-only timestamps
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

    console.log(`Found ${investments?.length || 0} investments to check`);

    let fixedCount = 0;
    const fixedInvestments = [];

    for (const investment of investments || []) {
      // Check if the dates are date-only (no time component)
      const startDate = new Date(investment.start_date);
      const endDate = new Date(investment.end_date);
      
      // Check if both dates are at midnight UTC (indicating date-only storage)
      const isStartMidnight = startDate.getUTCHours() === 0 && startDate.getUTCMinutes() === 0 && startDate.getUTCSeconds() === 0;
      const isEndMidnight = endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0 && endDate.getUTCSeconds() === 0;
      
      if (isStartMidnight && isEndMidnight) {
        console.log(`Fixing investment ${investment.id} - adding realistic timestamps`);
        
        // Create realistic timestamps based on when the investment was likely made
        // Use the created_at timestamp if available, otherwise use a reasonable time
        let baseTime;
        if (investment.created_at) {
          baseTime = new Date(investment.created_at);
        } else if (investment.investment_time) {
          baseTime = new Date(investment.investment_time);
        } else {
          // Fallback: use a reasonable time during the day (2 PM PKT = 9 AM UTC)
          baseTime = new Date(startDate);
          baseTime.setUTCHours(9, 0, 0, 0); // 9 AM UTC = 2 PM PKT
        }
        
        // Set start time to the base time
        const newStartDate = new Date(baseTime);
        
        // Set end time to the same time but on the end date
        const newEndDate = new Date(endDate);
        newEndDate.setUTCHours(baseTime.getUTCHours(), baseTime.getUTCMinutes(), baseTime.getUTCSeconds(), 0);
        
        // Update the investment with proper timestamps
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
            base_time_source: investment.created_at ? 'created_at' : 
                             investment.investment_time ? 'investment_time' : 'default_2pm_pkt'
          });
          console.log(`✅ Fixed investment ${investment.id}`);
        }
      } else {
        console.log(`Investment ${investment.id} already has proper timestamps, skipping`);
      }
    }

    console.log(`✅ Investment timestamp fix complete. Fixed ${fixedCount} investments`);

    return NextResponse.json({
      success: true,
      message: 'Investment timestamps fixed successfully',
      results: {
        total_investments: investments?.length || 0,
        fixed_investments: fixedCount,
        skipped_investments: (investments?.length || 0) - fixedCount,
        fixed_details: fixedInvestments
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Investment timestamp fix error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
