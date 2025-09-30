"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClearSessionPage() {
  const [status, setStatus] = useState<string>("Ready to clear session");
  const [loading, setLoading] = useState(false);

  const clearEverything = async () => {
    setLoading(true);
    setStatus("Clearing all session data...");
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // 1. Sign out from Supabase
      setStatus("1/5 Signing out from Supabase...");
      await supabase.auth.signOut({ scope: 'global' });
      
      // 2. Clear localStorage
      setStatus("2/5 Clearing localStorage...");
      localStorage.clear();
      
      // 3. Clear sessionStorage
      setStatus("3/5 Clearing sessionStorage...");
      sessionStorage.clear();
      
      // 4. Clear cookies (what we can access)
      setStatus("4/5 Clearing cookies...");
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      });
      
      // 5. Force page reload
      setStatus("5/5 Reloading page...");
      
      setTimeout(() => {
        setStatus("✅ Session cleared! Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login?next=/admin&cleared=1";
        }, 1000);
      }, 1000);
      
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  const manualSteps = () => {
    return (
      <div className="space-y-3 text-sm">
        <p><strong>Manual browser cache clearing:</strong></p>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li><strong>Chrome/Edge:</strong> Press Ctrl+Shift+Delete → Check "Cookies" and "Cached images" → Clear data</li>
          <li><strong>Firefox:</strong> Press Ctrl+Shift+Delete → Check "Cookies" and "Cache" → Clear Now</li>
          <li><strong>Safari:</strong> Develop menu → Empty Caches, then Safari → Clear History</li>
          <li><strong>Or use Incognito/Private mode</strong> for testing</li>
        </ol>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clear Session & Cache</h1>
        <p className="text-muted-foreground">Force clear all authentication data to fix admin access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🧹 Complete Session Clear</CardTitle>
          <CardDescription>
            This will clear ALL authentication data and force a fresh login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h3 className="font-semibold">Status</h3>
            <p className="mt-1">{status}</p>
          </div>

          <Button 
            onClick={clearEverything} 
            disabled={loading}
            className="w-full"
            variant="destructive"
          >
            {loading ? "Clearing..." : "🧹 Clear Everything & Force Re-login"}
          </Button>

          <div className="text-sm text-muted-foreground">
            <p><strong>This will clear:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Supabase authentication session</li>
              <li>Browser localStorage</li>
              <li>Browser sessionStorage</li>
              <li>Authentication cookies</li>
              <li>Force page reload</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔧 Alternative: Manual Clear</CardTitle>
        </CardHeader>
        <CardContent>
          {manualSteps()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 Complete Fix Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <p><strong>If admin role still not working, follow this exact process:</strong></p>
          </div>
          
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Run the force script:</strong>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                node force-admin-check.js your-email@example.com
              </code>
            </li>
            <li><strong>Clear session:</strong> Click the button above</li>
            <li><strong>Fresh login:</strong> Login again with your email</li>
            <li><strong>Test:</strong> Visit <a href="/debug-user" className="text-blue-600 underline">/debug-user</a></li>
            <li><strong>Access admin:</strong> Go to <a href="/admin" className="text-blue-600 underline">/admin</a></li>
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
