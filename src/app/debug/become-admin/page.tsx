"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Shield, Loader2 } from "lucide-react";

export default function BecomeAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);

  const handleBecomeAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/debug/become-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: "Network error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-600/20 rounded-full w-fit">
            <Shield className="h-8 w-8 text-orange-400" />
          </div>
          <CardTitle className="text-white text-xl">Become Admin</CardTitle>
          <CardDescription className="text-gray-400">
            Grant yourself admin access to the mining platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!result && (
            <Button 
              onClick={handleBecomeAdmin}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Admin Role...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Grant Admin Access
                </>
              )}
            </Button>
          )}

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  result.success 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {result.message}
                </span>
              </div>
              
              {result.success && result.user && (
                <div className="mt-3 text-sm text-green-800 dark:text-green-200">
                  <p><strong>Email:</strong> {result.user.email}</p>
                  <p><strong>Role:</strong> {result.user.role}</p>
                  <p className="mt-2 text-xs">
                    You can now access the admin panel at <code>/admin</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {result?.success && (
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/admin'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Admin Panel
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Back to Home
              </Button>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>⚠️ This is a debug tool for development only.</p>
            <p>Remove this page in production.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
