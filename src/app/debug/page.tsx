"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<any>({});
  const [dbTest, setDbTest] = useState<string>("Testing...");

  useEffect(() => {
    // Check environment variables
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? "✅ Set" : "❌ Missing",
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ? "✅ Set" : "❌ Missing",
      NEXT_PUBLIC_NOWPAYMENTS_CURRENCY: process.env.NEXT_PUBLIC_NOWPAYMENTS_CURRENCY ? "✅ Set" : "❌ Missing",
    });

    // Test database connection
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setDbTest(`❌ Database Error: ${data.error}`);
        } else {
          setDbTest(`✅ Database Connected - Found ${data.plans?.length || 0} plans`);
        }
      })
      .catch(err => {
        setDbTest(`❌ API Error: ${err.message}`);
      });
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">WeEarn Debug Information</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3">Environment Variables</h2>
          <div className="bg-gray-100 p-4 rounded">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="font-mono">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Database Connection</h2>
          <div className="bg-gray-100 p-4 rounded">
            {dbTest}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Current URL</h2>
          <div className="bg-gray-100 p-4 rounded">
            {typeof window !== 'undefined' ? window.location.href : 'Server-side'}
          </div>
        </div>
      </div>
    </div>
  );
}
