"use client";

import { useEffect, useState } from "react";

export default function SimpleTestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      try {
        // Test 1: Check if we can call the APIs
        console.log("Testing APIs...");
        
        // Test add transaction
        try {
          const txResponse = await fetch('/api/test/add-transaction', { 
            headers: { 'Content-Type': 'application/json' }
          });
          const txResult = await txResponse.json();
          setResults((prev: any) => ({ ...prev, addTransaction: txResult }));
          console.log("Add transaction result:", txResult);
        } catch (e: any) {
          setResults((prev: any) => ({ ...prev, addTransaction: { error: e.message } }));
          console.error("Add transaction error:", e);
        }

        // Test create withdrawal
        try {
          const wdResponse = await fetch('/api/test/create-withdrawal', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const wdResult = await wdResponse.json();
          setResults((prev: any) => ({ ...prev, createWithdrawal: wdResult }));
        } catch (e: any) {
          setResults((prev: any) => ({ ...prev, createWithdrawal: { error: e.message } }));
        }

        // Test clear withdrawals
        try {
          const clearResponse = await fetch('/api/test/clear-withdrawals', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const clearResult = await clearResponse.json();
          setResults((prev: any) => ({ ...prev, clearWithdrawals: clearResult }));
        } catch (e: any) {
          setResults((prev: any) => ({ ...prev, clearWithdrawals: { error: e.message } }));
        }

      } catch (error: any) {
        console.error("Test error:", error);
      } finally {
        setLoading(false);
      }
    };

    runTests();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Running Tests...</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple API Test Results</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded border">
          <h2 className="font-bold text-lg mb-2">Add Transaction API:</h2>
          <pre className="text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(results.addTransaction, null, 2)}
          </pre>
        </div>

        <div className="bg-green-50 p-4 rounded border">
          <h2 className="font-bold text-lg mb-2">Create Withdrawal API:</h2>
          <pre className="text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(results.createWithdrawal, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 p-4 rounded border">
          <h2 className="font-bold text-lg mb-2">History Page Status:</h2>
          <pre className="text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(results.historyPage, null, 2)}
          </pre>
        </div>

        <div className="mt-6">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Tests
          </button>
        </div>
      </div>
    </div>
  );
}
