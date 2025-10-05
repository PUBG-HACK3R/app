import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const results = {
      earnings: null as any,
      planCompletions: null as any,
      errors: [] as string[]
    };

    // Process daily earnings
    try {
      const earningsResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/cron/daily-earnings`, {
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
      const completionsResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/plans/complete`, {
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
