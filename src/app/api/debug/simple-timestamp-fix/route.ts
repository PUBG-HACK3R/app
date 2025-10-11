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

    console.log('🔧 Simple timestamp fix using investment_time column...');

    // Get ALL user investments
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

    console.log(`Found ${investments?.length || 0} investments to fix`);

    let fixedCount = 0;
    const fixedInvestments = [];

    for (const investment of investments || []) {
      console.log(`Fixing investment ${investment.id}`);
      console.log(`Current investment_time: ${investment.investment_time}`);
      console.log(`Current duration_days: ${investment.duration_days}`);
      
      // Use investment_time as start_date
      const startDate = new Date(investment.investment_time);
      
      // Add duration_days to get end_date
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + investment.duration_days);
      
      console.log(`New start_date: ${startDate.toISOString()}`);
      console.log(`New end_date: ${endDate.toISOString()}`);
      
      // Update the investment
      const { error: updateError } = await admin
        .from("user_investments")
        .update({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
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
          investment_time: investment.investment_time,
          duration_days: investment.duration_days,
          new_start: startDate.toISOString(),
          new_end: endDate.toISOString(),
          start_local: startDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
          end_local: endDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
        });
        console.log(`✅ Fixed investment ${investment.id}`);
      }
    }

    console.log(`✅ Simple fix complete. Fixed ${fixedCount} investments`);

    return NextResponse.json({
      success: true,
      message: 'Investment timestamps fixed using investment_time column',
      results: {
        total_investments: investments?.length || 0,
        fixed_investments: fixedCount,
        fixed_details: fixedInvestments
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Simple timestamp fix error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
