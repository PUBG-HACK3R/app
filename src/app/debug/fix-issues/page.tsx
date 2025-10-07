'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ResultData {
  success: boolean;
  data: any;
  timestamp: string;
}

interface Results {
  [key: string]: ResultData;
}

export default function FixIssuesPage() {
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState<string | null>(null);

  const executeAction = async (action: string, endpoint: string) => {
    setLoading(action);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResults((prev: Results) => ({
        ...prev,
        [action]: {
          success: response.ok,
          data,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setResults((prev: Results) => ({
        ...prev,
        [action]: {
          success: false,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const checkData = async () => {
    setLoading('check');
    try {
      const response = await fetch('/api/debug/check-data');
      const data = await response.json();
      setResults((prev: Results) => ({
        ...prev,
        check: {
          success: response.ok,
          data,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setResults((prev: Results) => ({
        ...prev,
        check: {
          success: false,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fix Platform Issues</h1>
        <p className="text-muted-foreground">Debug and fix common platform issues</p>
      </div>

      <div className="grid gap-4">
        {/* Check Current Data */}
        <Card>
          <CardHeader>
            <CardTitle>1. Check Current Data</CardTitle>
            <CardDescription>Check all database tables for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkData}
              disabled={loading === 'check'}
              className="mb-4"
            >
              {loading === 'check' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Data
            </Button>
            
            {results.check && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {results.check.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {results.check.success ? 'Success' : 'Error'} - {results.check.timestamp}
                  </span>
                </div>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.check.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix Balance Record */}
        <Card>
          <CardHeader>
            <CardTitle>2. Fix Missing Balance Record</CardTitle>
            <CardDescription>Create missing balance record in database</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => executeAction('balance', '/api/debug/fix-balance')}
              disabled={loading === 'balance'}
              className="mb-4"
            >
              {loading === 'balance' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fix Balance Record
            </Button>
            
            {results.balance && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {results.balance.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {results.balance.success ? 'Success' : 'Error'} - {results.balance.timestamp}
                  </span>
                </div>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.balance.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clean Stuck Deposits */}
        <Card>
          <CardHeader>
            <CardTitle>3. Clean Stuck NOWPayments Deposits</CardTitle>
            <CardDescription>Remove incomplete/stuck deposit records</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => executeAction('deposits', '/api/debug/clean-stuck-deposit')}
              disabled={loading === 'deposits'}
              className="mb-4"
              variant="destructive"
            >
              {loading === 'deposits' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clean Stuck Deposits
            </Button>
            
            {results.deposits && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {results.deposits.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {results.deposits.success ? 'Success' : 'Error'} - {results.deposits.timestamp}
                  </span>
                </div>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.deposits.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">1. <strong>Check Data</strong> - See current state of your account</p>
          <p className="text-sm">2. <strong>Fix Balance</strong> - Create missing balance record (shows $0.00 initially)</p>
          <p className="text-sm">3. <strong>Clean Deposits</strong> - Remove stuck NOWPayments deposit that was never completed</p>
          <p className="text-sm text-muted-foreground">After running these fixes, your wallet should show $0.00 balance and no pending transactions.</p>
        </CardContent>
      </Card>
    </main>
  );
}
