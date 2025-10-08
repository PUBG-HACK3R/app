import { NextResponse } from "next/server";
import { db } from "@/lib/database/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optimized cron job - processes earnings in time windows
export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const now = new Date();
    console.log(`🚀 Starting earnings processing at ${now.toISOString()}`);
    
    // Process earnings for investments due now (individual timing)
    await db.processDailyEarnings();
    
    console.log('✅ Individual earnings processed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Individual earnings processed successfully',
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('❌ Earnings cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process earnings'
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
