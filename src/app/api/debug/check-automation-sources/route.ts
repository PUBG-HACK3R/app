import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking for automation sources...');
    
    const results: any[] = [];
    
    // 1. CHECK FOR CRON JOBS OR SCHEDULED TASKS
    console.log('⏰ Checking for scheduled tasks...');
    
    try {
      // Check if there are any API routes that might be called automatically
      const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
      const suspiciousEndpoints = [
        'cron',
        'schedule',
        'auto',
        'batch',
        'job',
        'task',
        'worker'
      ];
      
      const findSuspiciousFiles = (dir: string, files: string[] = []): string[] => {
        try {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              // Check if directory name suggests automation
              if (suspiciousEndpoints.some(keyword => item.toLowerCase().includes(keyword))) {
                files.push(fullPath);
              }
              // Recursively check subdirectories
              findSuspiciousFiles(fullPath, files);
            } else if (item === 'route.ts' || item === 'route.js') {
              // Check if parent directory suggests automation
              const parentDir = path.basename(dir);
              if (suspiciousEndpoints.some(keyword => parentDir.toLowerCase().includes(keyword))) {
                files.push(fullPath);
              }
            }
          }
        } catch (error) {
          // Directory might not exist or be accessible
        }
        return files;
      };
      
      const suspiciousFiles = findSuspiciousFiles(apiDir);
      
      if (suspiciousFiles.length > 0) {
        results.push({
          type: 'SUSPICIOUS_API_ENDPOINTS',
          severity: 'HIGH',
          count: suspiciousFiles.length,
          files: suspiciousFiles.map(f => f.replace(process.cwd(), '')),
          recommendation: 'Review these endpoints for automatic execution'
        });
      }
    } catch (error) {
      results.push({
        type: 'FILE_SYSTEM_CHECK_FAILED',
        severity: 'MEDIUM',
        error: error.message,
        recommendation: 'Manually check for suspicious API endpoints'
      });
    }

    // 2. CHECK DATABASE FOR AUTOMATION INDICATORS
    console.log('🗄️ Checking database for automation patterns...');
    
    try {
      // Check for plans created with identical patterns
      const { data: recentPlans, error: plansError } = await supabase
        .from('investment_plans')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (plansError) throw plansError;

      if (recentPlans && recentPlans.length > 0) {
        // Check for exact time intervals (suggesting automation)
        const timestamps = recentPlans.map(p => new Date(p.created_at).getTime());
        const intervals = [];
        
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        
        // Check for repeated intervals
        const intervalMap: { [key: number]: number } = {};
        intervals.forEach(interval => {
          const roundedInterval = Math.round(interval / (1000 * 60)); // Round to minutes
          intervalMap[roundedInterval] = (intervalMap[roundedInterval] || 0) + 1;
        });
        
        Object.entries(intervalMap).forEach(([interval, count]) => {
          if (count > 2 && parseInt(interval) > 0 && parseInt(interval) < 1440) { // Between 1 minute and 1 day
            results.push({
              type: 'REPEATED_TIME_INTERVALS',
              severity: 'CRITICAL',
              interval: `${interval} minutes`,
              occurrences: count,
              recommendation: 'This suggests automated plan creation - investigate immediately'
            });
          }
        });

        // Check for plans created at exact hour/minute marks
        const exactTimeCreations = recentPlans.filter(plan => {
          const date = new Date(plan.created_at);
          return date.getMinutes() === 0 && date.getSeconds() === 0;
        });

        if (exactTimeCreations.length > 2) {
          results.push({
            type: 'EXACT_TIME_CREATIONS',
            severity: 'HIGH',
            count: exactTimeCreations.length,
            plans: exactTimeCreations.map(p => ({
              id: p.id,
              createdAt: p.created_at,
              amount: p.amount
            })),
            recommendation: 'Plans created at exact hour marks suggest automation'
          });
        }
      }
    } catch (error) {
      results.push({
        type: 'DATABASE_AUTOMATION_CHECK_FAILED',
        severity: 'MEDIUM',
        error: error.message,
        recommendation: 'Manually check database for automation patterns'
      });
    }

    // 3. CHECK FOR EXTERNAL WEBHOOKS OR API CALLS
    console.log('🌐 Checking for external automation sources...');
    
    try {
      // Check recent transactions for patterns that suggest external automation
      const { data: recentTransactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (transError) throw transError;

      if (recentTransactions && recentTransactions.length > 0) {
        // Check for transactions with identical amounts
        const amountMap: { [key: number]: any[] } = {};
        recentTransactions.forEach(transaction => {
          const amount = Math.abs(transaction.amount);
          if (!amountMap[amount]) amountMap[amount] = [];
          amountMap[amount].push(transaction);
        });

        Object.entries(amountMap).forEach(([amount, transactions]) => {
          if (transactions.length > 3 && parseFloat(amount) > 0) {
            results.push({
              type: 'IDENTICAL_TRANSACTION_AMOUNTS',
              severity: 'MEDIUM',
              amount: parseFloat(amount),
              count: transactions.length,
              recommendation: 'Multiple identical transactions may indicate automation'
            });
          }
        });
      }
    } catch (error) {
      results.push({
        type: 'TRANSACTION_AUTOMATION_CHECK_FAILED',
        severity: 'LOW',
        error: error.message,
        recommendation: 'Manually check transactions for automation patterns'
      });
    }

    // 4. CHECK ENVIRONMENT FOR AUTOMATION TOOLS
    console.log('🔧 Checking environment for automation tools...');
    
    const automationIndicators = [];
    
    // Check for common automation environment variables
    const automationEnvVars = [
      'CRON_SECRET',
      'WEBHOOK_SECRET',
      'AUTOMATION_KEY',
      'SCHEDULER_TOKEN',
      'BOT_TOKEN',
      'AUTO_INVEST',
      'BATCH_PROCESS'
    ];
    
    automationEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        automationIndicators.push({
          type: 'AUTOMATION_ENV_VAR',
          variable: envVar,
          status: 'FOUND'
        });
      }
    });

    if (automationIndicators.length > 0) {
      results.push({
        type: 'AUTOMATION_ENVIRONMENT_DETECTED',
        severity: 'HIGH',
        indicators: automationIndicators,
        recommendation: 'Review these environment variables for automation setup'
      });
    }

    // 5. CHECK FOR SPECIFIC AUTOMATION PATTERNS
    console.log('🎯 Checking for specific automation patterns...');
    
    try {
      // Check for the specific case mentioned: $70 1-day plan
      const { data: seventyDollarPlans, error: seventyError } = await supabase
        .from('investment_plans')
        .select(`
          *,
          profiles!inner(email)
        `)
        .eq('amount', 70)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (!seventyError && seventyDollarPlans && seventyDollarPlans.length > 0) {
        results.push({
          type: 'SPECIFIC_AMOUNT_PATTERN',
          severity: 'CRITICAL',
          amount: 70,
          count: seventyDollarPlans.length,
          plans: seventyDollarPlans.map(p => ({
            id: p.id,
            userId: p.user_id,
            userEmail: p.profiles.email,
            createdAt: p.created_at,
            status: p.status
          })),
          recommendation: 'Multiple $70 investments detected - investigate if these are legitimate user actions'
        });
      }

      // Check for plans created "day after tomorrow" pattern
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      
      const { data: futurePlans, error: futureError } = await supabase
        .from('investment_plans')
        .select('*')
        .gte('created_at', dayAfterTomorrow.toISOString().split('T')[0])
        .lt('created_at', new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (!futureError && futurePlans && futurePlans.length > 0) {
        results.push({
          type: 'FUTURE_DATED_PLANS',
          severity: 'CRITICAL',
          count: futurePlans.length,
          date: dayAfterTomorrow.toDateString(),
          plans: futurePlans.map(p => ({
            id: p.id,
            userId: p.user_id,
            createdAt: p.created_at,
            amount: p.amount
          })),
          recommendation: 'Plans created for future dates suggest automated scheduling'
        });
      }
    } catch (error) {
      results.push({
        type: 'SPECIFIC_PATTERN_CHECK_FAILED',
        severity: 'LOW',
        error: error.message,
        recommendation: 'Manually check for specific automation patterns'
      });
    }

    // 6. GENERATE SUMMARY AND RECOMMENDATIONS
    const criticalIssues = results.filter(r => r.severity === 'CRITICAL').length;
    const highIssues = results.filter(r => r.severity === 'HIGH').length;
    
    const summary = {
      totalFindings: results.length,
      criticalFindings: criticalIssues,
      highFindings: highIssues,
      automationLikelihood: criticalIssues > 0 ? 'VERY HIGH' : 
                           highIssues > 0 ? 'HIGH' : 
                           results.length > 0 ? 'MEDIUM' : 'LOW',
      recommendations: [
        criticalIssues > 0 ? 'URGENT: Disable any automated processes immediately' : null,
        'Check all API endpoints for unauthorized access',
        'Review server logs for automated requests',
        'Implement rate limiting on all investment endpoints',
        'Add CAPTCHA verification for plan creation',
        'Monitor database for unusual patterns',
        'Set up alerts for rapid plan creation'
      ].filter(Boolean)
    };

    console.log('✅ Automation source check completed');
    console.log(`📊 Found ${results.length} potential automation indicators`);

    return NextResponse.json({
      success: true,
      summary,
      findings: results,
      timestamp: new Date().toISOString(),
      message: `Automation check completed. Likelihood: ${summary.automationLikelihood}`
    });

  } catch (error) {
    console.error('❌ Automation source check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
