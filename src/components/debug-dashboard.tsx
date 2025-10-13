"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Bug,
  Shield,
  Activity,
  RefreshCw,
  AlertCircle,
  Zap
} from "lucide-react";

interface DebugReport {
  websiteStatus: string;
  checksCompleted: number;
  checksSuccessful: number;
  checksFailed: number;
  totalIssuesFound: number;
  issueBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  nextSteps: string[];
  fullReport: any;
}

export function DebugDashboard() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DebugReport | null>(null);
  const [fixing, setFixing] = useState(false);

  const runFullDebug = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/master-debug-dashboard');
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
        toast.success('Debug scan completed');
      } else {
        toast.error('Debug scan failed');
      }
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Error running debug scan');
    } finally {
      setLoading(false);
    }
  };

  const fixEarningsIssues = async () => {
    setFixing(true);
    try {
      const response = await fetch('/api/debug/fix-earnings-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix_all' })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Fixed ${data.summary?.earningsFixed || 0} earnings issues`);
        // Re-run debug after fix
        setTimeout(() => runFullDebug(), 1000);
      } else {
        toast.error('Failed to fix earnings issues');
      }
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Error fixing earnings issues');
    } finally {
      setFixing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('CRITICAL')) return <XCircle className="h-6 w-6 text-red-500" />;
    if (status.includes('HIGH RISK')) return <AlertTriangle className="h-6 w-6 text-orange-500" />;
    if (status.includes('MEDIUM RISK')) return <AlertCircle className="h-6 w-6 text-yellow-500" />;
    if (status.includes('GOOD TO GO')) return <CheckCircle className="h-6 w-6 text-green-500" />;
    return <Clock className="h-6 w-6 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status.includes('CRITICAL')) return 'destructive';
    if (status.includes('HIGH RISK')) return 'destructive';
    if (status.includes('MEDIUM RISK')) return 'secondary';
    if (status.includes('GOOD TO GO')) return 'default';
    return 'outline';
  };

  const getSeverityBadge = (severity: string, count: number) => {
    if (count === 0) return null;
    
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };

    return (
      <Badge className={colors[severity as keyof typeof colors] || colors.low}>
        {count} {severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Website Debug Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive website health check and issue detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runFullDebug} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning...' : 'Run Full Debug'}
          </Button>
          {report && report.issueBreakdown.critical > 0 && (
            <Button 
              onClick={fixEarningsIssues} 
              disabled={fixing}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Zap className={`h-4 w-4 ${fixing ? 'animate-pulse' : ''}`} />
              {fixing ? 'Fixing...' : 'Auto-Fix Issues'}
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Running comprehensive website scan...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Overall Status */}
          <Alert className={report.websiteStatus.includes('CRITICAL') ? 'border-red-500' : 
                           report.websiteStatus.includes('HIGH RISK') ? 'border-orange-500' :
                           report.websiteStatus.includes('MEDIUM RISK') ? 'border-yellow-500' : 
                           'border-green-500'}>
            <div className="flex items-center gap-2">
              {getStatusIcon(report.websiteStatus)}
              <div className="text-lg font-medium">Website Status</div>
            </div>
            <AlertDescription className="mt-2">
              <div className="text-base font-medium mb-2">{report.websiteStatus}</div>
              <div className="text-sm text-muted-foreground">
                Completed {report.checksSuccessful}/{report.checksCompleted} checks • 
                Found {report.totalIssuesFound} total issues
              </div>
            </AlertDescription>
          </Alert>

          {/* Issues Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {report.issueBreakdown.critical}
                </div>
                <p className="text-xs text-muted-foreground">
                  Must fix before launch
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {report.issueBreakdown.high}
                </div>
                <p className="text-xs text-muted-foreground">
                  Fix immediately
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {report.issueBreakdown.medium}
                </div>
                <p className="text-xs text-muted-foreground">
                  Should fix soon
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
                <Bug className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {report.issueBreakdown.low}
                </div>
                <p className="text-xs text-muted-foreground">
                  Minor issues
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Immediate Action Required
              </CardTitle>
              <CardDescription>
                Priority tasks to ensure website stability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Health Checks
              </CardTitle>
              <CardDescription>
                Status of individual system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(report.fullReport?.checks || {}).map(([checkName, checkData]: [string, any]) => (
                  <div key={checkName} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium capitalize">
                        {checkName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {checkData.status === 'COMPLETED' ? 'Scan completed' : 
                         checkData.status === 'FAILED' ? 'Scan failed' : 'Error occurred'}
                      </p>
                    </div>
                    <Badge variant={checkData.status === 'COMPLETED' ? 'default' : 'destructive'}>
                      {checkData.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Bug className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Debug Data</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Full Debug" to start a comprehensive website health check
            </p>
            <Button onClick={runFullDebug}>
              Start Debug Scan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
