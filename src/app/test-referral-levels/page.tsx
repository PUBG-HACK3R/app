"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestReferralLevelsPage() {
  const [setupResult, setSetupResult] = useState<any>(null);
  const [levelsResult, setLevelsResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/setup-referral-levels');
      const data = await response.json();
      setSetupResult(data);
    } catch (error) {
      setSetupResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testLevelsAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/referral-levels');
      const data = await response.json();
      setLevelsResult(data);
    } catch (error) {
      setLevelsResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <h1 className="text-3xl font-bold text-center">Test Referral Levels System</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1. Setup Database</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testSetup} 
                disabled={loading}
                className="w-full"
              >
                Run Setup
              </Button>
              {setupResult && (
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(setupResult, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Test Levels API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testLevelsAPI} 
                disabled={loading}
                className="w-full"
              >
                Test API
              </Button>
              {levelsResult && (
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
                  {JSON.stringify(levelsResult, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manual Database Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Database Tables Missing</h4>
              <p className="text-sm text-yellow-700 mb-3">
                The referral levels tables need to be created first. Follow these steps:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Open your Supabase dashboard</li>
                <li>Go to SQL Editor</li>
                <li>Copy the SQL from <code>SETUP_DATABASE.sql</code> file</li>
                <li>Paste and run the SQL</li>
                <li>Come back and click "Run Setup" again</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium mb-2">Test Pages:</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="/referrals" target="_blank">🎯 Test Referrals Page</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/settings/modern" target="_blank">👤 Test Profile Page</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/" target="_blank">🏠 Test Landing Page</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
