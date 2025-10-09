"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const setupAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Check admin role status first
        const roleCheck = await fetch('/api/debug/check-admin-role');
        const roleData = await roleCheck.json();
        console.log('Role check after setup:', roleData);
        
        // Force a page refresh to clear any cached middleware state
        setTimeout(() => {
          window.location.href = '/admin?t=' + Date.now();
        }, 1000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-purple-500/20 rounded-full w-fit">
            <Shield className="h-8 w-8 text-purple-400" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Setup</CardTitle>
          <CardDescription className="text-slate-400">
            Grant yourself admin access to the WeEarn platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!result && (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-300">
                Click the button below to grant yourself admin privileges. 
                Make sure you're logged in first.
              </p>
              
              <Button 
                onClick={setupAdmin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up admin access...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Grant Admin Access
                  </>
                )}
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                result.success 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'Success!' : 'Error'}
                  </span>
                </div>
                
                <p className="text-sm">
                  {result.message || result.error}
                </p>
                
                {result.success && result.user && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Email:</span>
                      <span className="font-mono">{result.user.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Role:</span>
                      <Badge className="bg-purple-500/20 text-purple-300">
                        {result.user.role}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {result.success && (
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-3">
                    Redirecting to admin panel in 2 seconds...
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/admin'}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Go to Admin Panel Now
                  </Button>
                </div>
              )}

              {!result.success && (
                <Button 
                  onClick={setupAdmin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
