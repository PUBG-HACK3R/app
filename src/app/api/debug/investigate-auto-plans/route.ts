import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Investigating automatic plan creation...');
    
    const results: any[] = [];
    
    // 1. CHECK ALL RECENT PLANS
    const { data: recentPlans, error: plansError } = await supabase
      .from('investment_plans')
      .select(`
        *,
        profiles!inner(email)
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (plansError) throw plansError;

    console.log(`📋 Found ${recentPlans?.length || 0} recent plans`);

    // 2. ANALYZE PLAN CREATION PATTERNS
    if (recentPlans && recentPlans.length > 0) {
      const plansByUser: { [key: string]: any[] } = {};
      const plansByDay: { [key: string]: any[] } = {};
      
      recentPlans.forEach(plan => {
        // Group by user
        if (!plansByUser[plan.user_id]) plansByUser[plan.user_id] = [];
        plansByUser[plan.user_id].push(plan);
        
        // Group by day
        const dayKey = new Date(plan.created_at).toDateString();
        if (!plansByDay[dayKey]) plansByDay[dayKey] = [];
        plansByDay[dayKey].push(plan);
      });

      // Check for suspicious patterns
      Object.entries(plansByUser).forEach(([userId, userPlans]) => {
        if (userPlans.length > 1) {
          results.push({
            type: 'MULTIPLE_PLANS_PER_USER',
            severity: userPlans.length > 3 ? 'HIGH' : 'MEDIUM',
            userId,
            userEmail: userPlans[0].profiles.email,
            planCount: userPlans.length,
            plans: userPlans.map(p => ({
              id: p.id,
              amount: p.amount,
              planName: p.plan_name,
              createdAt: p.created_at,
              status: p.status
            })),
            timeSpans: userPlans.map((plan, index) => {
              if (index === 0) return null;
              const prevTime = new Date(userPlans[index - 1].created_at).getTime();
              const currTime = new Date(plan.created_at).getTime();
              return Math.abs(currTime - prevTime) / (1000 * 60); // minutes
            }).filter(Boolean)
          });
        }
      });

      // Check daily patterns
      Object.entries(plansByDay).forEach(([day, dayPlans]) => {
        if (dayPlans.length > 5) {
          results.push({
            type: 'HIGH_DAILY_ACTIVITY',
            severity: dayPlans.length > 10 ? 'HIGH' : 'MEDIUM',
            date: day,
            planCount: dayPlans.length,
            uniqueUsers: [...new Set(dayPlans.map(p => p.user_id))].length,
            plans: dayPlans.map(p => ({
              userId: p.user_id,
              userEmail: p.profiles.email,
              amount: p.amount,
              planName: p.plan_name,
              createdAt: p.created_at
            }))
          });
        }
      });
    }

    // 3. CHECK FOR PLANS CREATED OUTSIDE BUSINESS HOURS
    if (recentPlans) {
      const suspiciousTimePlans = recentPlans.filter(plan => {
        const hour = new Date(plan.created_at).getHours();
        return hour < 6 || hour > 23; // Plans created between 11 PM and 6 AM
      });

      if (suspiciousTimePlans.length > 0) {
        results.push({
          type: 'OFF_HOURS_CREATION',
          severity: 'MEDIUM',
          count: suspiciousTimePlans.length,
          plans: suspiciousTimePlans.map(p => ({
            id: p.id,
            userId: p.user_id,
            userEmail: p.profiles.email,
            createdAt: p.created_at,
            hour: new Date(p.created_at).getHours(),
            amount: p.amount,
            planName: p.plan_name
          }))
        });
      }
    }

    // 4. CHECK FOR PLANS WITH IDENTICAL AMOUNTS/TIMES
    if (recentPlans && recentPlans.length > 1) {
      const duplicateAmounts: { [key: string]: any[] } = {};
      
      recentPlans.forEach(plan => {
        const key = `${plan.amount}_${plan.plan_name}`;
        if (!duplicateAmounts[key]) duplicateAmounts[key] = [];
        duplicateAmounts[key].push(plan);
      });

      Object.entries(duplicateAmounts).forEach(([key, plans]) => {
        if (plans.length > 2) {
          const [amount, planName] = key.split('_');
          results.push({
            type: 'DUPLICATE_PLAN_AMOUNTS',
            severity: plans.length > 5 ? 'HIGH' : 'MEDIUM',
            amount: parseFloat(amount),
            planName,
            count: plans.length,
            plans: plans.map(p => ({
              id: p.id,
              userId: p.user_id,
              userEmail: p.profiles.email,
              createdAt: p.created_at
            }))
          });
        }
      });
    }

    // 5. CHECK SPECIFIC CASE: $70 1-day plan that returned without earnings
    const { data: seventyDollarPlans, error: seventyError } = await supabase
      .from('investment_plans')
      .select(`
        *,
        profiles!inner(email),
        transactions!inner(*)
      `)
      .eq('amount', 70)
      .eq('plan_name', '1 Day Plan')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!seventyError && seventyDollarPlans) {
      seventyDollarPlans.forEach(plan => {
        const transactions = plan.transactions || [];
        const earningTransactions = transactions.filter((t: any) => t.type === 'earning');
        const returnTransactions = transactions.filter((t: any) => t.type === 'investment_return');
        
        if (returnTransactions.length > 0 && earningTransactions.length === 0) {
          results.push({
            type: 'SEVENTY_DOLLAR_NO_EARNINGS',
            severity: 'CRITICAL',
            planId: plan.id,
            userId: plan.user_id,
            userEmail: plan.profiles.email,
            amount: plan.amount,
            planName: plan.plan_name,
            status: plan.status,
            createdAt: plan.created_at,
            endDate: plan.end_date,
            expectedEarnings: (70 * plan.roi_percentage / 100).toFixed(2),
            actualEarnings: 0,
            transactions: transactions.map((t: any) => ({
              type: t.type,
              amount: t.amount,
              createdAt: t.created_at,
              description: t.description
            }))
          });
        }
      });
    }

    // 6. CHECK FOR AUTOMATED PROCESSES
    console.log('🤖 Checking for automated processes...');
    
    // Look for patterns that suggest automation
    const automationIndicators: any[] = [];
    
    // Check if plans are being created at exact intervals
    if (recentPlans && recentPlans.length > 2) {
      const timestamps = recentPlans.map(p => new Date(p.created_at).getTime()).sort();
      const intervals: number[] = [];
      
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      
      // Check for repeated intervals (suggesting automation)
      const intervalCounts: { [key: number]: number } = {};
      intervals.forEach(interval => {
        const roundedInterval = Math.round(interval / (1000 * 60)); // Round to minutes
        intervalCounts[roundedInterval] = (intervalCounts[roundedInterval] || 0) + 1;
      });
      
      Object.entries(intervalCounts).forEach(([interval, count]) => {
        if (count > 2 && parseInt(interval) < 60) { // Same interval repeated more than twice, less than 1 hour
          automationIndicators.push({
            type: 'REPEATED_INTERVALS',
            interval: `${interval} minutes`,
            occurrences: count,
            severity: 'HIGH'
          });
        }
      });
    }

    // 7. GENERATE SUMMARY AND RECOMMENDATIONS
    const criticalIssues = results.filter(r => r.severity === 'CRITICAL').length;
    const highIssues = results.filter(r => r.severity === 'HIGH').length;
    
    const summary = {
      totalIssues: results.length,
      criticalIssues,
      highIssues,
      automationIndicators,
      recommendations: [
        criticalIssues > 0 ? 'URGENT: Investigate critical issues immediately' : null,
        'Check all API endpoints for unauthorized access',
        'Review user authentication and session management',
        'Audit all cron jobs and scheduled tasks',
        'Implement rate limiting on plan creation',
        'Add logging for all plan creation events',
        'Consider adding CAPTCHA for plan creation'
      ].filter(Boolean)
    };

    console.log('✅ Auto-plan investigation completed');
    console.log(`📊 Found ${results.length} suspicious patterns`);

    return NextResponse.json({
      success: true,
      summary,
      suspiciousPatterns: results,
      automationIndicators,
      timestamp: new Date().toISOString(),
      message: `Investigation completed. Found ${results.length} suspicious patterns.`
    });

  } catch (error) {
    console.error('❌ Auto-plan investigation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
