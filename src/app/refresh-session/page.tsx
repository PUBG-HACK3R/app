"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RefreshSessionPage() {
  const [status, setStatus] = useState<string>("Ready");
  const [loading, setLoading] = useState(false);

  const refreshSession = async () => {
    setLoading(true);
    setStatus("Refreshing session...");
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Force refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }
      
      setStatus("Session refreshed successfully!");
      
      // Wait a moment then redirect to debug page
      setTimeout(() => {
        window.location.href = "/debug-user";
      }, 2000);
      
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const forceLogoutAndLogin = async () => {
    setLoading(true);
    setStatus("Logging out...");
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Sign out completely
      await supabase.auth.signOut();
      
      setStatus("Logged out! Redirecting to login...");
      
      // Redirect to login with admin panel as next page
      setTimeout(() => {
        window.location.href = "/login?next=/admin";
      }, 2000);
      
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Refresh Session</h1>
        <p className="text-muted-foreground">Fix admin access issues by refreshing your session</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>
            If you set admin role but still can't access admin panel, try these options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h3 className="font-semibold">Current Status</h3>
            <p className="mt-1">{status}</p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={refreshSession} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Refreshing..." : "🔄 Refresh Session"}
            </Button>
            
            <Button 
              onClick={forceLogoutAndLogin} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? "Logging out..." : "🚪 Force Logout & Re-login"}
            </Button>
            
            <Button 
              onClick={() => window.location.href = "/debug-user"}
              variant="secondary"
              className="w-full"
            >
              🔍 Check Current Session
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>When to use:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>After setting admin role in Supabase Dashboard</li>
              <li>After running the make-admin script</li>
              <li>When admin panel redirects to dashboard</li>
              <li>When role changes don't take effect</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p><strong>1. Check your admin role:</strong></p>
            <p>Visit <a href="/debug-user" className="text-blue-600 underline">/debug-user</a> to see your current role</p>
          </div>
          
          <div className="space-y-2">
            <p><strong>2. If role shows "user" instead of "admin":</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Run: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">node make-admin.js your-email@example.com</code></li>
              <li>Or set manually in Supabase Dashboard → Auth → Users → Your User → User Metadata</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <p><strong>3. If role shows "admin" but still can't access:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Click "Refresh Session" above</li>
              <li>Or "Force Logout & Re-login"</li>
              <li>Clear browser cache/cookies</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
