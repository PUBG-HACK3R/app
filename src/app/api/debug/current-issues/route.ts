import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.replace('/api/debug/current-issues', '');
    
    // Get the comprehensive check results
    const response = await fetch(`${baseUrl}/api/debug/comprehensive-website-check`);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch: ${response.status}`
      });
    }
    
    const data = await response.json();
    
    // Filter and display issues by priority
    const issues = data.issues || [];
    const highIssues = issues.filter((issue: any) => issue.severity === 'HIGH');
    const mediumIssues = issues.filter((issue: any) => issue.severity === 'MEDIUM');
    const lowIssues = issues.filter((issue: any) => issue.severity === 'LOW');
    
    return NextResponse.json({
      success: true,
      summary: {
        total: issues.length,
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length
      },
      highPriorityIssues: highIssues.map((issue: any, index: number) => ({
        number: index + 1,
        category: issue.category,
        issue: issue.issue,
        severity: issue.severity,
        details: issue.details,
        recommendation: issue.recommendation
      })),
      mediumPriorityIssues: mediumIssues.map((issue: any, index: number) => ({
        number: index + 1,
        category: issue.category,
        issue: issue.issue,
        severity: issue.severity,
        details: issue.details,
        recommendation: issue.recommendation
      })),
      lowPriorityIssues: lowIssues.map((issue: any, index: number) => ({
        number: index + 1,
        category: issue.category,
        issue: issue.issue,
        severity: issue.severity,
        details: issue.details,
        recommendation: issue.recommendation
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
