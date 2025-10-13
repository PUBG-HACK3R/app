import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.replace('/api/debug/show-issues', '');
    
    console.log('🔍 Fetching comprehensive check results...');
    
    // Get the comprehensive check results
    const response = await fetch(`${baseUrl}/api/debug/comprehensive-website-check`);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch comprehensive check: ${response.status}`
      }, { status: 500 });
    }
    
    const data = await response.json();
    
    // Extract and format the issues for easy reading
    const issues = data.issues || [];
    const highPriorityIssues = issues.filter((issue: any) => issue.severity === 'HIGH');
    const mediumPriorityIssues = issues.filter((issue: any) => issue.severity === 'MEDIUM');
    
    return NextResponse.json({
      success: true,
      summary: data.summary,
      totalIssues: issues.length,
      highPriorityIssues: {
        count: highPriorityIssues.length,
        issues: highPriorityIssues.map((issue: any) => ({
          category: issue.category,
          issue: issue.issue,
          severity: issue.severity,
          details: issue.details,
          recommendation: issue.recommendation
        }))
      },
      mediumPriorityIssues: {
        count: mediumPriorityIssues.length,
        issues: mediumPriorityIssues.map((issue: any) => ({
          category: issue.category,
          issue: issue.issue,
          severity: issue.severity,
          details: issue.details,
          recommendation: issue.recommendation
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to show issues:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
