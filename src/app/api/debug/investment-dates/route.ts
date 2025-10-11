import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Get user investments with raw date data
    const { data: investments, error: investmentError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (investmentError) {
      console.error("Error fetching investments:", investmentError);
      return NextResponse.json({ 
        error: "Failed to fetch investments", 
        details: investmentError.message 
      }, { status: 500 });
    }

    // Format the data for debugging
    const debugData = (investments || []).map(inv => {
      const startDate = new Date(inv.start_date);
      const endDate = new Date(inv.end_date);
      const createdAt = new Date(inv.created_at);
      
      return {
        id: inv.id,
        plan_id: inv.plan_id,
        amount_invested: inv.amount_invested,
        status: inv.status,
        
        // Raw database values
        raw_start_date: inv.start_date,
        raw_end_date: inv.end_date,
        raw_created_at: inv.created_at,
        
        // Parsed dates
        parsed_start_date: startDate.toISOString(),
        parsed_end_date: endDate.toISOString(),
        parsed_created_at: createdAt.toISOString(),
        
        // Local timezone formatting
        local_start_date: startDate.toLocaleString('en-US', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        local_end_date: endDate.toLocaleString('en-US', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        
        // UTC formatting
        utc_start_date: startDate.toUTCString(),
        utc_end_date: endDate.toUTCString(),
        
        // Check if dates are valid
        start_date_valid: !isNaN(startDate.getTime()),
        end_date_valid: !isNaN(endDate.getTime()),
        
        // Check if dates are midnight (00:00)
        start_is_midnight: startDate.getUTCHours() === 0 && startDate.getUTCMinutes() === 0,
        end_is_midnight: endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0
      };
    });

    return NextResponse.json({
      success: true,
      user_id: user.id,
      user_email: user.email,
      current_time: new Date().toISOString(),
      current_time_pkt: new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      investments_count: investments?.length || 0,
      investments: debugData
    });

  } catch (error: any) {
    console.error("Investment dates debug error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
