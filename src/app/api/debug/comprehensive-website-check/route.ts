import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DebugResult {
  category: string;
  issue: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: any;
  recommendation: string;
}

export async function GET(request: NextRequest) {
  try {
    const results: DebugResult[] = [];
    
    console.log('🔍 Starting comprehensive website debugging...');
    
    // 1. CHECK FOR AUTOMATIC USER INVESTMENT CREATION ISSUES
    console.log('📋 Checking for automatic user investment creation...');
    try {
      // Check for USER INVESTMENTS (not plan templates) created suspiciously
      const { data: suspiciousInvestments, error: investError } = await supabase
        .from('user_investments')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (investError) throw investError;

      // Check for multiple investments created in short time spans by same user
      if (suspiciousInvestments && suspiciousInvestments.length > 0) {
        const investmentsByUser: { [key: string]: any[] } = {};
        suspiciousInvestments.forEach(investment => {
          const userId = investment.user_id;
          if (!investmentsByUser[userId]) investmentsByUser[userId] = [];
          investmentsByUser[userId].push(investment);
        });

        Object.keys(investmentsByUser).forEach(userId => {
          const userInvestments = investmentsByUser[userId];
          if (userInvestments.length > 3) { // More than 3 investments in a week is suspicious
            results.push({
              category: 'AUTOMATIC_PLANS',
              issue: 'Multiple user investments created rapidly',
              severity: 'HIGH',
              details: {
                userId,
                investmentCount: userInvestments.length,
                investments: userInvestments.slice(0, 3), // Show first 3
                timespan: '7 days'
              },
              recommendation: 'Investigate if these investments were created automatically or by legitimate user action'
            });
          }
        });
      }
      
      console.log(`✅ User investment check completed. Found ${suspiciousInvestments?.length || 0} recent investments.`);
      
      // If no suspicious patterns found, add a success result
      if (!suspiciousInvestments || suspiciousInvestments.length === 0) {
        results.push({
          category: 'AUTOMATIC_PLANS',
          issue: 'No suspicious user investment patterns detected',
          severity: 'LOW',
          details: { message: 'All user investments appear to be legitimate' },
          recommendation: 'Continue monitoring for unusual patterns'
        });
      }
    } catch (error) {
      results.push({
        category: 'AUTOMATIC_PLANS',
        issue: 'Failed to check automatic plan creation',
        severity: 'MEDIUM',
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendation: 'Fix database access for plan checking'
      });
    }

    // 2. CHECK INVESTMENT EARNINGS ISSUES
    console.log('💰 Checking investment earnings processing...');
    try {
      // Check for completed investments without earnings
      const { data: completedInvestments, error: investError } = await supabase
        .from('investment_plans')
        .select(`
          *,
          transactions!inner(*)
        `)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (investError) throw investError;

      if (completedInvestments) {
        completedInvestments.forEach(investment => {
          const transactions = investment.transactions || [];
          const earningTransactions = transactions.filter((t: any) => t.type === 'earning');
          const principalReturn = transactions.filter((t: any) => t.type === 'investment_return');
          
          // Check if investment completed without any earnings
          if (earningTransactions.length === 0 && principalReturn.length > 0) {
            results.push({
              category: 'EARNINGS_PROCESSING',
              issue: 'Investment completed without earnings',
              severity: 'CRITICAL',
              details: {
                investmentId: investment.id,
                userId: investment.user_id,
                amount: investment.amount,
                planName: investment.plan_name,
                completedAt: investment.updated_at,
                expectedEarnings: (investment.amount * investment.roi_percentage / 100).toFixed(2)
              },
              recommendation: 'Manually process missing earnings and fix earnings calculation logic'
            });
          }

          // Check for investments that should have completed but haven't
          const endDate = new Date(investment.end_date);
          const now = new Date();
          if (endDate < now && investment.status !== 'completed') {
            results.push({
              category: 'EARNINGS_PROCESSING',
              issue: 'Investment past end date but not completed',
              severity: 'HIGH',
              details: {
                investmentId: investment.id,
                userId: investment.user_id,
                endDate: investment.end_date,
                currentStatus: investment.status,
                daysPastDue: Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
              },
              recommendation: 'Run earnings check to complete overdue investments'
            });
          }
        });
      }
    } catch (error) {
      results.push({
        category: 'EARNINGS_PROCESSING',
        issue: 'Failed to check earnings processing',
        severity: 'HIGH',
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendation: 'Fix database access for earnings checking'
      });
    }

    // 3. CHECK FOR UNAUTHORIZED TRANSACTIONS
    console.log('💳 Checking for unauthorized transactions...');
    try {
      const { data: recentTransactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (transError) throw transError;

      if (recentTransactions) {
        // Check for large transactions
        recentTransactions.forEach(transaction => {
          if (Math.abs(transaction.amount) > 1000) {
            results.push({
              category: 'TRANSACTIONS',
              issue: 'Large transaction detected',
              severity: 'MEDIUM',
              details: {
                transactionId: transaction.id,
                userId: transaction.user_id,
                amount: transaction.amount,
                type: transaction.type,
                description: transaction.description
              },
              recommendation: 'Verify if this large transaction is legitimate'
            });
          }

          // Check for negative balance after transaction
          if (transaction.balance_after < 0) {
            results.push({
              category: 'TRANSACTIONS',
              issue: 'Transaction resulted in negative balance',
              severity: 'HIGH',
              details: {
                transactionId: transaction.id,
                userId: transaction.user_id,
                balanceAfter: transaction.balance_after,
                amount: transaction.amount
              },
              recommendation: 'Fix negative balance and review transaction logic'
            });
          }
        });
      }
    } catch (error) {
      results.push({
        category: 'TRANSACTIONS',
        issue: 'Failed to check transactions',
        severity: 'MEDIUM',
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendation: 'Fix database access for transaction checking'
      });
    }

    // 4. CHECK USER BALANCES INTEGRITY
    console.log('👤 Checking user balance integrity...');
    try {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .not('balance', 'is', null);

      if (usersError) throw usersError;

      if (users) {
        for (const user of users) {
          // Calculate balance from transactions
          const { data: userTransactions, error: userTransError } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

          if (!userTransError && userTransactions) {
            let calculatedBalance = 0;
            userTransactions.forEach(transaction => {
              calculatedBalance += transaction.amount;
            });

            // Check if calculated balance matches stored balance
            const balanceDifference = Math.abs(calculatedBalance - user.balance);
            if (balanceDifference > 0.01) { // Allow for small rounding differences
              results.push({
                category: 'BALANCE_INTEGRITY',
                issue: 'User balance mismatch',
                severity: 'HIGH',
                details: {
                  userId: user.id,
                  storedBalance: user.balance,
                  calculatedBalance: calculatedBalance.toFixed(2),
                  difference: balanceDifference.toFixed(2)
                },
                recommendation: 'Recalculate and fix user balance from transaction history'
              });
            }
          }
        }
      }
    } catch (error) {
      results.push({
        category: 'BALANCE_INTEGRITY',
        issue: 'Failed to check balance integrity',
        severity: 'MEDIUM',
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendation: 'Fix database access for balance checking'
      });
    }

    // 5. CHECK FOR DUPLICATE REFERRAL CODES
    console.log('🔗 Checking referral system integrity...');
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, referral_code')
        .not('referral_code', 'is', null);

      if (profilesError) throw profilesError;

      if (profiles) {
        const referralCodes: { [key: string]: string[] } = {};
        profiles.forEach(profile => {
          if (!referralCodes[profile.referral_code]) {
            referralCodes[profile.referral_code] = [];
          }
          referralCodes[profile.referral_code].push(profile.id);
        });

        Object.entries(referralCodes).forEach(([code, userIds]) => {
          if (userIds.length > 1) {
            results.push({
              category: 'REFERRAL_SYSTEM',
              issue: 'Duplicate referral codes detected',
              severity: 'HIGH',
              details: {
                referralCode: code,
                userIds: userIds,
                count: userIds.length
              },
              recommendation: 'Generate unique referral codes for affected users'
            });
          }
        });
      }
    } catch (error) {
      results.push({
        category: 'REFERRAL_SYSTEM',
        issue: 'Failed to check referral system',
        severity: 'MEDIUM',
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendation: 'Fix database access for referral checking'
      });
    }

    // 6. CHECK FOR ORPHANED RECORDS
    console.log('🗄️ Checking for orphaned database records...');
    try {
      // Check for transactions without users
      const { data: orphanedTransactions, error: orphanError } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          profiles!inner(id)
        `);

      if (orphanError) {
        // This means there are transactions without valid users
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('id, user_id');
        
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id');

        if (allTransactions && allUsers) {
          const userIds = new Set(allUsers.map(u => u.id));
          const orphaned = allTransactions.filter(t => !userIds.has(t.user_id));
          
          if (orphaned.length > 0) {
            results.push({
              category: 'DATA_INTEGRITY',
              issue: 'Orphaned transactions detected',
              severity: 'MEDIUM',
              details: {
                count: orphaned.length,
                transactionIds: orphaned.slice(0, 10).map(t => t.id)
              },
              recommendation: 'Clean up orphaned transactions or restore missing user records'
            });
          }
        }
      }
    } catch (error) {
      results.push({
        category: 'DATA_INTEGRITY',
        issue: 'Failed to check for orphaned records',
        severity: 'LOW',
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendation: 'Fix database access for orphaned record checking'
      });
    }

    // 7. SUMMARY AND RECOMMENDATIONS
    const criticalIssues = results.filter(r => r.severity === 'CRITICAL').length;
    const highIssues = results.filter(r => r.severity === 'HIGH').length;
    const mediumIssues = results.filter(r => r.severity === 'MEDIUM').length;
    const lowIssues = results.filter(r => r.severity === 'LOW').length;

    const summary = {
      totalIssues: results.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      websiteStatus: criticalIssues > 0 ? 'CRITICAL - DO NOT LAUNCH' : 
                    highIssues > 0 ? 'HIGH RISK - NEEDS IMMEDIATE ATTENTION' :
                    mediumIssues > 0 ? 'MEDIUM RISK - SHOULD FIX BEFORE LAUNCH' :
                    'GOOD TO GO',
      recommendations: [
        criticalIssues > 0 ? 'URGENT: Fix all critical issues before any real users access the website' : null,
        highIssues > 0 ? 'Fix all high severity issues immediately' : null,
        'Run this debug check daily until launch',
        'Set up monitoring for automatic issue detection',
        'Create backup and rollback procedures'
      ].filter(Boolean)
    };

    console.log('✅ Comprehensive website check completed');
    console.log(`📊 Summary: ${results.length} issues found (${criticalIssues} critical, ${highIssues} high, ${mediumIssues} medium, ${lowIssues} low)`);

    return NextResponse.json({
      success: true,
      summary,
      issues: results,
      timestamp: new Date().toISOString(),
      message: `Website debugging completed. Found ${results.length} issues.`
    });

  } catch (error) {
    console.error('❌ Comprehensive website check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      summary: {
        websiteStatus: 'UNKNOWN - DEBUG SYSTEM FAILED',
        recommendations: ['Fix the debugging system first', 'Manual review required']
      }
    }, { status: 500 });
  }
}
