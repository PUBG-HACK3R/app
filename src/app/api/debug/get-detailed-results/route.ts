import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.replace('/api/debug/get-detailed-results', '');
    const results: any = {};

    console.log('🔍 Getting detailed debug results...');

    // 1. GET COMPREHENSIVE CHECK DETAILS
    try {
      const response = await fetch(`${baseUrl}/api/debug/comprehensive-website-check`);
      if (response.ok) {
        const data = await response.json();
        results.comprehensiveCheck = data;
      } else {
        results.comprehensiveCheck = { error: 'Failed to fetch', status: response.status };
      }
    } catch (error) {
      results.comprehensiveCheck = { error: error instanceof Error ? error.message : String(error) };
    }

    // 2. GET AUTO-PLANS CHECK DETAILS
    try {
      const response = await fetch(`${baseUrl}/api/debug/investigate-auto-plans`);
      if (response.ok) {
        const data = await response.json();
        results.autoPlansCheck = data;
      } else {
        results.autoPlansCheck = { error: 'Failed to fetch', status: response.status };
      }
    } catch (error) {
      results.autoPlansCheck = { error: error instanceof Error ? error.message : String(error) };
    }

    // 3. GET EARNINGS CHECK DETAILS
    try {
      const response = await fetch(`${baseUrl}/api/user/check-earnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug: true })
      });
      if (response.ok) {
        const data = await response.json();
        results.earningsCheck = data;
      } else {
        results.earningsCheck = { error: 'Failed to fetch', status: response.status };
      }
    } catch (error) {
      results.earningsCheck = { error: error instanceof Error ? error.message : String(error) };
    }

    // 4. GET REFERRAL CHECK DETAILS
    try {
      const response = await fetch(`${baseUrl}/api/debug/test-referral-api`);
      if (response.ok) {
        const data = await response.json();
        results.referralCheck = data;
      } else {
        results.referralCheck = { error: 'Failed to fetch', status: response.status };
      }
    } catch (error) {
      results.referralCheck = { error: error instanceof Error ? error.message : String(error) };
    }

    // 5. GET TRANSACTION CHECK DETAILS
    try {
      const response = await fetch(`${baseUrl}/api/debug/check-transactions`);
      if (response.ok) {
        const data = await response.json();
        results.transactionCheck = data;
      } else {
        results.transactionCheck = { error: 'Failed to fetch', status: response.status };
      }
    } catch (error) {
      results.transactionCheck = { error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      success: true,
      detailedResults: results,
      timestamp: new Date().toISOString(),
      message: 'Detailed debug results retrieved'
    });

  } catch (error) {
    console.error('❌ Failed to get detailed results:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
