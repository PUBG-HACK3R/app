"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  UserPlus, 
  DollarSign, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Users,
  CreditCard
} from "lucide-react";

export function AdminTools() {
  const [setRoleLoading, setSetRoleLoading] = React.useState(false);
  const [topupLoading, setTopupLoading] = React.useState(false);
  const [testLoading, setTestLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Set Role Form
  const [roleUserId, setRoleUserId] = React.useState("");
  const [role, setRole] = React.useState<"user" | "admin">("admin");
  const [adminSecret, setAdminSecret] = React.useState("");

  // Top-up Form
  const [topupUserId, setTopupUserId] = React.useState("");
  const [topupAmount, setTopupAmount] = React.useState("");
  const [topupReason, setTopupReason] = React.useState("");

  const handleSetRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetRoleLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: roleUserId,
          role,
          adminSecret,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setRoleUserId("");
        setAdminSecret("");
      } else {
        setMessage({ type: 'error', text: data.error || "Failed to set role" });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Network error occurred" });
    } finally {
      setSetRoleLoading(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: topupUserId,
          amount: parseFloat(topupAmount),
          reason: topupReason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setTopupUserId("");
        setTopupAmount("");
        setTopupReason("");
      } else {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details} (Code: ${data.code || 'N/A'})`
          : data.error || "Failed to top up user";
        setMessage({ type: 'error', text: errorMessage });
        console.error("Top-up error details:", data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Network error occurred" });
    } finally {
      setTopupLoading(false);
    }
  };

  const handleTestDatabase = async () => {
    setTestLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/test-db");
      const data = await res.json();

      if (res.ok) {
        const tests = data.tests;
        const allPassed = Object.values(tests).every((test: any) => test.success);
        
        if (allPassed) {
          setMessage({ type: 'success', text: "All database tests passed! Top-up functionality should work." });
        } else {
          const failedTests = Object.entries(tests)
            .filter(([_, test]: [string, any]) => !test.success)
            .map(([name, test]: [string, any]) => `${name}: ${test.error}`)
            .join(", ");
          setMessage({ type: 'error', text: `Database tests failed: ${failedTests}` });
        }
        console.log("Database test results:", data);
      } else {
        setMessage({ type: 'error', text: data.error || "Database test failed" });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Network error during database test" });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Set Admin Role */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>Set User Role</CardTitle>
          </div>
          <CardDescription>
            Grant or revoke admin access for users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleUserId">User ID</Label>
              <Input
                id="roleUserId"
                type="text"
                placeholder="Enter user UUID"
                value={roleUserId}
                onChange={(e) => setRoleUserId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Get user ID from debug-user page or Supabase dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={role === "admin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("admin")}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Button>
                <Button
                  type="button"
                  variant={role === "user" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("user")}
                >
                  <Users className="h-4 w-4 mr-1" />
                  User
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminSecret">Admin Secret</Label>
              <Input
                id="adminSecret"
                type="password"
                placeholder="Enter admin secret"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Set ADMIN_SECRET in your .env.local (default: admin123)
              </p>
            </div>

            <Button type="submit" disabled={setRoleLoading} className="w-full">
              {setRoleLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting Role...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Set {role === "admin" ? "Admin" : "User"} Role
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User Top-up */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            <CardTitle>User Top-up</CardTitle>
          </div>
          <CardDescription>
            Add funds to a user's wallet balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTopup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topupUserId">User ID</Label>
              <Input
                id="topupUserId"
                type="text"
                placeholder="Enter user UUID"
                value={topupUserId}
                onChange={(e) => setTopupUserId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topupAmount">Amount (USDT)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="topupAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-10"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topupReason">Reason (Optional)</Label>
              <Textarea
                id="topupReason"
                placeholder="e.g., Bonus payment, Compensation, etc."
                value={topupReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTopupReason(e.target.value)}
                rows={2}
              />
            </div>

            <Button type="submit" disabled={topupLoading} className="w-full bg-green-600 hover:bg-green-700">
              {topupLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Top-up...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Top-up User
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status Message */}
      {message && (
        <div className="lg:col-span-2">
          <Card className={`border-0 shadow-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  message.type === 'success' 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {message.text}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Test */}
      <div className="lg:col-span-2">
        <Card className="border-0 shadow-lg bg-gray-50 dark:bg-gray-950/20">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Database Test</CardTitle>
            <CardDescription>Test database connectivity and transaction functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestDatabase} 
              disabled={testLoading}
              variant="outline"
              className="w-full"
            >
              {testLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Testing Database...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Test Database Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <div className="lg:col-span-2">
        <Card className="border-0 shadow-lg bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 mb-2">
                Set Admin Role
              </Badge>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                1. Get the user ID from <code>/debug-user</code> page or Supabase dashboard<br/>
                2. Set ADMIN_SECRET in your .env.local file<br/>
                3. Use the form to grant admin access to users
              </p>
            </div>
            <Separator className="bg-blue-200 dark:bg-blue-800" />
            <div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700 mb-2">
                User Top-up
              </Badge>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                1. Enter the user's UUID<br/>
                2. Specify the amount to add to their balance<br/>
                3. Optionally provide a reason for the top-up<br/>
                4. The amount will be added as a deposit transaction
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
