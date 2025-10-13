import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log('🔄 MANUAL TRIGGER: Checking earnings for user:', user.id);

    // Call the earnings check endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/check-earnings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}; sb-refresh-token=${(await supabase.auth.getSession()).data.session?.refresh_token}`
      }
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "Earnings check triggered manually",
      earnings_check_result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Manual earnings check trigger error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
