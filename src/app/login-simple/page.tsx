"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SimpleLoginPage() {
  const search = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const message = search.get("message");
    if (message) {
      setSuccessMessage(message);
    }
  }, [search]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login-server', {
        method: 'POST',
        body: formData,
      });

      if (response.redirected) {
        // Server redirected us, follow the redirect
        window.location.href = response.url;
        return;
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Success
      window.location.href = '/dashboard';

    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              WeEarn
            </span>
          </div>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Access your WeEarn account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm">Email</label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                required 
                placeholder="your@email.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm">Password</label>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required 
                placeholder="Your password"
              />
            </div>
            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                {successMessage}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account? <Link className="underline" href="/signup">Sign up</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Having issues? <Link className="underline" href="/login">Try the original login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
