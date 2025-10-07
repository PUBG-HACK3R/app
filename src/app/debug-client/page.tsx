"use client";

import { useState } from "react";

export default function DebugClientPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint: string, method = 'GET') => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { 
        method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      setResults((prev: any) => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          ok: response.ok,
          data
        }
      }));
    } catch (error: any) {
      setResults((prev: any) => ({
        ...prev,
        [endpoint]: {
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => testAPI('/api/test/ping')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          Test Ping API
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/database')}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          disabled={loading}
        >
          Test Database Debug
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/add-transaction', 'POST')}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          disabled={loading}
        >
          Test Add Transaction
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/create-withdrawal', 'POST')}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          disabled={loading}
        >
          Test Create Withdrawal
        </button>
        
        <button 
          onClick={() => window.open('/wallet/withdraw', '_blank')}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          Open Withdrawal Page
        </button>
        
        <button 
          onClick={() => window.open('/wallet/history', '_blank')}
          className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600"
        >
          Open History Page
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/clear-withdrawals', 'POST')}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
          disabled={loading}
        >
          Clear Old Withdrawals
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/withdrawal-data')}
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
          disabled={loading}
        >
          Debug Withdrawal Data
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/fix-timestamps', 'POST')}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          disabled={loading}
        >
          🔧 FIX TIMESTAMP ISSUE
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/manual-withdrawal', 'POST')}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          disabled={loading}
        >
          ✅ CREATE MANUAL WITHDRAWAL
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/check-subscriptions')}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          disabled={loading}
        >
          🔍 CHECK SUBSCRIPTIONS & EARNINGS
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/trigger-earnings', 'POST')}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
          disabled={loading}
        >
          ⚡ TRIGGER DAILY EARNINGS NOW
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/cron-detailed')}
          className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50"
          disabled={loading}
        >
          🔬 DETAILED CRON ANALYSIS
        </button>
        
        <button 
          onClick={() => testAPI('/api/test/debug-earnings', 'POST')}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          disabled={loading}
        >
          🚨 DEBUG EARNINGS WITH LOGS
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/refresh-plans')}
          className="bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600 disabled:opacity-50"
          disabled={loading}
        >
          🔄 CHECK FRESH PLAN DATA
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/all-subscriptions')}
          className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 disabled:opacity-50"
          disabled={loading}
        >
          📋 ALL SUBSCRIPTIONS & EARNINGS
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/purchase-history')}
          className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 disabled:opacity-50"
          disabled={loading}
        >
          💰 PURCHASE HISTORY & TRANSACTIONS
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/check-earning-timing')}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          disabled={loading}
        >
          ⏰ CHECK $100 PLAN EARNING TIMING
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/force-earning', 'POST')}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
          disabled={loading}
        >
          🚀 FORCE $100 PLAN EARNING (TEST)
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/active-plans-data')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading}
        >
          🔍 DEBUG ACTIVE PLANS DATA
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/check-pending-deposits')}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
          disabled={loading}
        >
          💰 CHECK PENDING DEPOSITS
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/check-nowpayments-deposit')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          🔍 CHECK NOWPAYMENTS DEPOSIT
        </button>
        
        <button 
          onClick={() => testAPI('/api/debug/check-deposits-table')}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          disabled={loading}
        >
          🔧 CHECK DEPOSITS TABLE STRUCTURE
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Testing...</p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(results).map(([endpoint, result]: [string, any]) => (
          <div key={endpoint} className="bg-gray-50 p-4 rounded-lg border">
            <h2 className="font-bold text-lg mb-2">{endpoint}</h2>
            <div className="bg-white p-3 rounded border">
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded border">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>First test "Ping API" to verify basic API functionality</li>
          <li>Then test "Database Debug" to check authentication and database access</li>
          <li>If those work, test "Add Transaction" and "Create Withdrawal"</li>
          <li>Check the results for any error messages</li>
        </ol>
      </div>
    </div>
  );
}
