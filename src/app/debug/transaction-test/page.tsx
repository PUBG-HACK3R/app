"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionList } from "@/components/wallet/transaction-list";

export default function TransactionTestPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  const testApiConnection = async () => {
    try {
      const response = await fetch('/api/debug/test-transaction');
      const data = await response.json();
      
      if (response.ok) {
        setApiStatus(`✅ API is working! User ID: ${data.user_id}`);
      } else {
        setApiStatus(`❌ API error: ${data.error}`);
      }
    } catch (err: any) {
      setApiStatus(`❌ Connection error: ${err.message}`);
    }
  };

  const createTestTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/debug/test-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Test transaction created successfully! ID: ${data.transaction?.id}`);
      } else {
        setError(`❌ Failed to create test transaction: ${data.error}`);
      }
    } catch (err: any) {
      setError(`❌ Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Debug Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button 
                onClick={testApiConnection} 
                variant="outline"
                className="w-full"
              >
                Test API Connection
              </Button>
              
              {apiStatus && (
                <div className={`rounded-lg p-3 text-sm ${
                  apiStatus.includes('✅') 
                    ? 'bg-green-900/20 border border-green-700/50 text-green-300' 
                    : 'bg-red-900/20 border border-red-700/50 text-red-300'
                }`}>
                  {apiStatus}
                </div>
              )}
            </div>

            <Button 
              onClick={createTestTransaction} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Creating..." : "Create Test $5 Signup Bonus Transaction"}
            </Button>

            {message && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <p className="text-green-300">{message}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList limit={10} showTitle={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
