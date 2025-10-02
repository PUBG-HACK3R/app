"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loginSchema } from "@/lib/validations";
import { Suspense } from "react";
import { 
  ParticleBackground, 
  FloatingCryptoIcons, 
  GlowingBorder 
} from "@/components/crypto-animations";
import { 
  Shield, 
  Lock, 
  Zap, 
  Bitcoin, 
  Coins, 
  CheckCircle, 
  Users,
  Star,
  ArrowRight,
  TrendingUp,
  DollarSign
} from "lucide-react";

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <ParticleBackground />
      <FloatingCryptoIcons />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-crypto-pulse"></div>
      
      <div className="relative flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <Image 
                  src="/logoC.png" 
                  alt="WeEarn Logo" 
                  width={60} 
                  height={60} 
                  className="relative object-contain"
                />
              </div>
            </div>

            {/* Hero Content */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Welcome Back Investor
                </Badge>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                  Continue Your
                  <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    Earning Journey
                  </span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Access your crypto investment dashboard and track your 
                  <span className="text-green-400 font-semibold"> daily returns</span> from 
                  USDT investments.
                </p>
              </div>

              {/* Stats */}
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-gray-300">Track your portfolio performance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Bitcoin className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Manage USDT investments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-gray-300">View real-time earnings</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <Image 
                    src="/logoC.png" 
                    alt="WeEarn Logo" 
                    width={50} 
                    height={50} 
                    className="relative object-contain"
                  />
                </div>
              </div>
            </div>

            <GlowingBorder>
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="text-center space-y-4">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
                    <CardDescription className="text-gray-400">
                      Sign in to your crypto investment account
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-500/30 mx-auto">
                    <Lock className="h-4 w-4 mr-2" />
                    Secure Login
                  </Badge>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium text-white">Email Address</label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        placeholder="Enter your email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-white">Password</label>
                        <Link 
                          href="/forgot-password"
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <PasswordInput 
                        id="password" 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        placeholder="Enter your password"
                      />
                    </div>
                    
                    {successMessage && (
                      <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <p className="text-sm text-green-300">{successMessage}</p>
                      </div>
                    )}
                    
                    {error && (
                      <div className="space-y-3 p-3 bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-700/50 rounded-lg">
                        <p className="text-sm text-red-300">{error}</p>
                        {(error.includes("split is not a function") || error.includes("attributes")) && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={clearBrowserData}
                            className="w-full border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                          >
                            Clear Browser Data & Try Again
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Signing In...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Access Dashboard
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-400">
                        Don&apos;t have an account?{" "}
                        <Link 
                          className="text-blue-400 hover:text-blue-300 underline font-medium" 
                          href="/signup"
                        >
                          Create account
                        </Link>
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </GlowingBorder>

            {/* Trust Indicators */}
            <div className="flex justify-center items-center gap-6 text-gray-400 text-xs">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-400" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="h-4 w-4 text-blue-400" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-orange-400" />
                <span>USDT Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
