import { NextResponse } from "next/server";
import { depositEventListener } from "@/services/deposit-event-listener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron job endpoint for the event-based deposit listener
 * This replaces the old sub-wallet monitoring system
 */
export async function GET(request: Request) {
  try {
    // Verify this is coming from cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting event-based deposit monitoring...');
    
    const startTime = Date.now();
    
    // Process events (this runs the full cycle once)
    await depositEventListener.processEvents();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Event-based deposit monitoring completed in ${duration}ms`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event-based deposit monitoring completed successfully',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Event-based deposit monitoring cron error:', error);
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
