"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, User, RefreshCw, LogOut, LogIn } from "lucide-react";

export default function AuthStatusPage() {
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<any>(null);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/user-status");
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      setAuthStatus({ error: "Failed to check auth status" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleLogout = async () => {
    try {
      // Clear any local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to logout
      window.location.href = '/auth/logout';
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800/50 border-gray-700/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-600/20 rounded-full w-fit">
            <User className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-white text-xl">Authentication Status</CardTitle>
          <CardDescription className="text-gray-400">
            Check your current login and admin status
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={checkAuthStatus}
              disabled={loading}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>

            {authStatus?.authenticated && (
              <Button 
                onClick={handleLogout}
                variant="destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout & Clear Session
              </Button>
            )}

            {!authStatus?.authenticated && (
              <Button 
                onClick={handleLogin}
                className="bg-green-600 hover:bg-green-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Go to Login
              </Button>
            )}
          </div>

          {authStatus && (
            <div className="space-y-4">
              {/* Authentication Status */}
              <div className={`p-4 rounded-lg border ${
                authStatus.authenticated 
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {authStatus.authenticated ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    authStatus.authenticated 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {authStatus.authenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                
                {authStatus.error && (
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Error: {authStatus.error}
                  </p>
                )}
              </div>

              {/* User Details */}
              {authStatus.user && (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">User Details:</h3>
                  <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <p><strong>ID:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{authStatus.user.id}</code></p>
                    <p><strong>Email:</strong> {authStatus.user.email}</p>
                    <p><strong>Created:</strong> {new Date(authStatus.user.created_at).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Profile Details */}
              {authStatus.profile && (
                <div className={`p-4 rounded-lg ${
                  authStatus.isAdmin 
                    ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800' 
                    : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                }`}>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Profile Details:</h3>
                  <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <p><strong>Role:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        authStatus.isAdmin 
                          ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' 
                          : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                      }`}>
                        {authStatus.profile.role}
                      </span>
                    </p>
                    <p><strong>Balance:</strong> ${authStatus.profile.balance_usdt || '0.00'} USDT</p>
                    <p><strong>Total Invested:</strong> ${authStatus.profile.total_invested || '0.00'}</p>
                    <p><strong>Total Earned:</strong> ${authStatus.profile.total_earned || '0.00'}</p>
                  </div>
                </div>
              )}

              {/* Profile Error */}
              {authStatus.profileError && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Profile Issue:</h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {authStatus.profileError}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Go to Dashboard
                </Button>
                
                {authStatus.isAdmin && (
                  <Button 
                    onClick={() => window.location.href = '/admin'}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Go to Admin Panel
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
