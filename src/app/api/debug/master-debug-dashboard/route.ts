import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting Master Debug Dashboard...');
    
    const baseUrl = request.url.replace('/api/debug/master-debug-dashboard', '');
    const results: any = {
      timestamp: new Date().toISOString(),
      overallStatus: 'CHECKING...',
      checks: {},
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
      },
      recommendations: []
    };

    // 1. RUN COMPREHENSIVE WEBSITE CHECK
    console.log('🔍 Running comprehensive website check...');
    try {
      const response = await fetch(`${baseUrl}/api/debug/comprehensive-website-check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.checks.comprehensiveCheck = {
          status: 'COMPLETED',
          data: data,
          issues: data.issues?.length || 0,
          criticalIssues: data.summary?.criticalIssues || 0
        };
        
        // Add to summary
        results.summary.totalIssues += data.issues?.length || 0;
        results.summary.criticalIssues += data.summary?.criticalIssues || 0;
        results.summary.highIssues += data.summary?.highIssues || 0;
        results.summary.mediumIssues += data.summary?.mediumIssues || 0;
        results.summary.lowIssues += data.summary?.lowIssues || 0;
        
        if (data.summary?.recommendations) {
          results.recommendations.push(...data.summary.recommendations);
        }
      } else {
        results.checks.comprehensiveCheck = {
          status: 'FAILED',
          error: 'Failed to run comprehensive check'
        };
      }
    } catch (error) {
      results.checks.comprehensiveCheck = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 2. RUN AUTO-PLANS INVESTIGATION
    console.log('🤖 Running auto-plans investigation...');
    try {
      const response = await fetch(`${baseUrl}/api/debug/investigate-auto-plans`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.checks.autoPlansCheck = {
          status: 'COMPLETED',
          data: data,
          suspiciousPatterns: data.suspiciousPatterns?.length || 0,
          automationIndicators: data.automationIndicators?.length || 0
        };
        
        // Add critical issues for automation indicators
        if (data.automationIndicators?.length > 0) {
          results.summary.criticalIssues += data.automationIndicators.length;
          results.summary.totalIssues += data.automationIndicators.length;
        }
        
        if (data.summary?.recommendations) {
          results.recommendations.push(...data.summary.recommendations);
        }
      } else {
        results.checks.autoPlansCheck = {
          status: 'FAILED',
          error: 'Failed to run auto-plans investigation'
        };
      }
    } catch (error) {
      results.checks.autoPlansCheck = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 3. CHECK EARNINGS PROCESSING
    console.log('💰 Checking earnings processing...');
    try {
      const response = await fetch(`${baseUrl}/api/user/check-earnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        results.checks.earningsCheck = {
          status: 'COMPLETED',
          data: data,
          processedEarnings: data.processedEarnings || 0,
          completedInvestments: data.completedInvestments || 0
        };
      } else {
        results.checks.earningsCheck = {
          status: 'FAILED',
          error: 'Failed to check earnings processing'
        };
      }
    } catch (error) {
      results.checks.earningsCheck = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 4. CHECK REFERRAL SYSTEM
    console.log('🔗 Checking referral system...');
    try {
      const response = await fetch(`${baseUrl}/api/debug/test-referral-api`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.checks.referralCheck = {
          status: 'COMPLETED',
          data: data,
          issues: data.issues?.length || 0
        };
        
        if (data.issues?.length > 0) {
          results.summary.totalIssues += data.issues.length;
          results.summary.mediumIssues += data.issues.length;
        }
      } else {
        results.checks.referralCheck = {
          status: 'FAILED',
          error: 'Failed to check referral system'
        };
      }
    } catch (error) {
      results.checks.referralCheck = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 5. CHECK TRANSACTION INTEGRITY
    console.log('💳 Checking transaction integrity...');
    try {
      const response = await fetch(`${baseUrl}/api/debug/check-transactions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.checks.transactionCheck = {
          status: 'COMPLETED',
          data: data,
          issues: data.issues?.length || 0
        };
        
        if (data.issues?.length > 0) {
          results.summary.totalIssues += data.issues.length;
          results.summary.highIssues += data.issues.length;
        }
      } else {
        results.checks.transactionCheck = {
          status: 'FAILED',
          error: 'Failed to check transactions'
        };
      }
    } catch (error) {
      results.checks.transactionCheck = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 6. DETERMINE OVERALL STATUS
    const { criticalIssues, highIssues, mediumIssues } = results.summary;
    
    if (criticalIssues > 0) {
      results.overallStatus = '🚨 CRITICAL - DO NOT LAUNCH';
      results.recommendations.unshift('🚨 URGENT: Fix all critical issues immediately before any real users access the website');
    } else if (highIssues > 0) {
      results.overallStatus = '⚠️ HIGH RISK - NEEDS IMMEDIATE ATTENTION';
      results.recommendations.unshift('⚠️ Fix all high severity issues before launch');
    } else if (mediumIssues > 0) {
      results.overallStatus = '⚡ MEDIUM RISK - SHOULD FIX BEFORE LAUNCH';
      results.recommendations.unshift('⚡ Address medium severity issues for better stability');
    } else {
      results.overallStatus = '✅ GOOD TO GO';
      results.recommendations.unshift('✅ Website appears to be functioning correctly');
    }

    // 7. ADD GENERAL RECOMMENDATIONS
    results.recommendations.push(
      '🔄 Run this debug dashboard daily until launch',
      '📊 Set up monitoring for automatic issue detection',
      '💾 Create backup and rollback procedures',
      '🔒 Implement additional security measures before launch',
      '📝 Document all fixes and changes made'
    );

    // 8. CREATE DETAILED REPORT
    const detailedReport = {
      websiteStatus: results.overallStatus,
      checksCompleted: Object.keys(results.checks).length,
      checksSuccessful: Object.values(results.checks).filter((check: any) => check.status === 'COMPLETED').length,
      checksFailed: Object.values(results.checks).filter((check: any) => check.status === 'FAILED' || check.status === 'ERROR').length,
      totalIssuesFound: results.summary.totalIssues,
      issueBreakdown: {
        critical: results.summary.criticalIssues,
        high: results.summary.highIssues,
        medium: results.summary.mediumIssues,
        low: results.summary.lowIssues
      },
      nextSteps: results.recommendations.slice(0, 5), // Top 5 recommendations
      fullReport: results
    };

    console.log('✅ Master Debug Dashboard completed');
    console.log(`📊 Overall Status: ${results.overallStatus}`);
    console.log(`🔍 Total Issues: ${results.summary.totalIssues} (${criticalIssues} critical, ${highIssues} high, ${mediumIssues} medium)`);

    return NextResponse.json({
      success: true,
      report: detailedReport,
      timestamp: new Date().toISOString(),
      message: `Master debug completed. Status: ${results.overallStatus}`
    });

  } catch (error) {
    console.error('❌ Master Debug Dashboard failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      report: {
        websiteStatus: '❌ UNKNOWN - DEBUG SYSTEM FAILED',
        message: 'The debug system itself has issues and needs to be fixed first'
      }
    }, { status: 500 });
  }
}
