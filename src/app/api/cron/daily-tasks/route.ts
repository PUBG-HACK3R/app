import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Get the base URL - Vercel provides VERCEL_URL without protocol
    let baseUrl = 'http://localhost:3000';
    if (process.env.VERCEL_URL) {
      baseUrl = process.env.VERCEL_URL.startsWith('http') 
        ? process.env.VERCEL_URL 
        : `https://${process.env.VERCEL_URL}`;
    }
      
    const results = {
      earnings: null as any,
      planCompletions: null as any,
      errors: [] as string[]
    };

    // Process daily earnings
    try {
      const earningsUrl = `${baseUrl}/api/cron/daily-earnings`;
      console.log('Calling earnings URL:', earningsUrl);
      const earningsResponse = await fetch(earningsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (earningsResponse.ok) {
        results.earnings = await earningsResponse.json();
      } else {
        const errorData = await earningsResponse.json();
        results.errors.push(`Daily earnings error: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      results.errors.push(`Daily earnings fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Process plan completions
    try {
      const completionsUrl = `${baseUrl}/api/plans/complete`;
      console.log('Calling completions URL:', completionsUrl);
      const completionsResponse = await fetch(completionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (completionsResponse.ok) {
        results.planCompletions = await completionsResponse.json();
      } else {
        const errorData = await completionsResponse.json();
        results.errors.push(`Plan completions error: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      results.errors.push(`Plan completions fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      message: "Daily tasks completed",
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Daily tasks cron error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unexpected error",
      success: false
    }, { status: 500 });
  }
}

// GET endpoint for manual testing
export async function GET() {
  return POST();
}
