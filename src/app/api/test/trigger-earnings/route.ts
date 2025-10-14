import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the REVALIDATE_SECRET from environment
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "REVALIDATE_SECRET not configured" }, { status: 500 });
    }

    // Trigger the daily earnings cron job
    const cronUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://weearn.sbs'}/api/cron/daily-returns?token=${secret}`;
    
    console.log("Triggering daily earnings cron job:", cronUrl);
    
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      cron_response: {
        status: response.status,
        ok: response.ok,
        data: result
      },
      message: "Daily earnings cron job triggered manually",
      triggered_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Manual earnings trigger error:", error);
    return NextResponse.json({
      error: "Failed to trigger earnings",
      message: error.message
    }, { status: 500 });
  }
}
