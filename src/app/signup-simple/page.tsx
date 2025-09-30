"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SimpleSignupPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!email || !email.includes('@')) {
        throw new Error("Please enter a valid email address");
      }
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Direct API call to avoid client-side cookie issues
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?message=Account created successfully. Please log in.');
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Account Created!</CardTitle>
            <CardDescription>
              Your account has been created successfully. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Enter your email and password to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm">Email</label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm">Password</label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link className="underline" href="/login">Log in</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Having issues? <Link className="underline" href="/signup">Try the original signup</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
