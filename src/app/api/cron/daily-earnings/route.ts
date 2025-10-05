import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This runs daily at midnight UTC (Vercel cron job)
export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
    // Call the SQL function to process daily earnings
    const { data, error } = await admin.rpc('process_daily_earnings');
    
    if (error) {
      console.error('Daily earnings processing error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log('Daily earnings processed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily earnings processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
