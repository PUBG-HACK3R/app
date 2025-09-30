"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema } from "@/lib/validations";
import { Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const message = search.get("message");
    if (message) {
      setSuccessMessage(message);
    }
  }, [search]);

  function clearBrowserData() {
    if (typeof window !== 'undefined') {
      try {
        // Clear all Supabase related data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
        
        // Clear cookies by setting them to expire
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') || name.includes('sb-')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });
        
        setError(null);
        alert("Browser data cleared! Please try logging in again.");
      } catch (err) {
        console.error("Error clearing browser data:", err);
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    console.log("Login form submitted with:", { email, password: password ? "***" : "empty" });
    
    try {
      // Validate input first
      const validatedData = loginSchema.parse({ email, password });
      console.log("Validation passed:", { email: validatedData.email, password: "***" });
      
      // Clear browser storage first to avoid cookie issues
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('sb-')) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
        } catch (storageError) {
          console.warn("Could not clear storage:", storageError);
        }
      }
      
      console.log("Using API endpoint to avoid client-side issues...");
      
      // Use API endpoint instead of direct client call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Success - redirect with a page refresh to pick up auth state
      const next = search.get("next") || "/dashboard";
      
      // Small delay to ensure cookies are set, then redirect
      setTimeout(() => {
        window.location.href = next;
      }, 100);
      
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Handle validation errors
      if (err.name === "ZodError") {
        setError(err.errors[0]?.message || "Invalid input");
        return;
      }
      
      // Handle common auth errors
      let message = err.message || "Login failed";
      
      if (message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please check your credentials.";
      } else if (message.includes("Email not confirmed")) {
        message = "Please check your email and click the confirmation link.";
      } else if (message.includes("split is not a function") || message.includes("attributes")) {
        message = "There was an issue with the login process. Please try again.";
      }
      
      setError(message);
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
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm">Email</label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm">Password</label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                {successMessage}
              </p>
            )}
            {error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                {(error.includes("split is not a function") || error.includes("attributes")) && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={clearBrowserData}
                    className="w-full"
                  >
                    Clear Browser Data & Try Again
                  </Button>
                )}
              </div>
            )}
            <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account? <Link className="underline" href="/signup">Sign up</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
