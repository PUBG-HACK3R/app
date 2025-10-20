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
import { signupSchema } from "@/lib/validations";
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
  ArrowRight
} from "lucide-react";

function SignupContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [referralCode, setReferralCode] = React.useState("");
  const [referralValid, setReferralValid] = React.useState<boolean | null>(null);
  const [referrerInfo, setReferrerInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get referral code from URL
  React.useEffect(() => {
    const refCode = search.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      validateReferralCode(refCode);
    }
  }, [search]);

  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 3) {
      setReferralValid(null);
      setReferrerInfo(null);
      return;
    }

    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: code })
      });

      const data = await response.json();
      setReferralValid(data.valid);
      setReferrerInfo(data.valid ? data.referrer : null);
    } catch (error) {
      setReferralValid(false);
      setReferrerInfo(null);
    }
  };

  const handleReferralCodeChange = (value: string) => {
    setReferralCode(value.toUpperCase());
    if (value.length >= 3) {
      validateReferralCode(value);
    } else {
      setReferralValid(null);
      setReferrerInfo(null);
    }
  };

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
        alert("Browser data cleared! Please try signing up again.");
      } catch (err) {
        console.error("Error clearing browser data:", err);
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    console.log("Form submitted with:", { email, password: password ? "***" : "empty" });
    
    try {
      // Check password confirmation first
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      
      // Validate input
      const validatedData = signupSchema.parse({ email, password });
      console.log("Validation passed:", { email: validatedData.email, password: "***" });
      
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase is not configured. Please set up your environment variables.");
      }
      
      // Clear browser storage first
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('sb-')) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
          
          // Clear cookies
          document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('supabase') || name.includes('sb-')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
          });
        } catch (storageError) {
          console.warn("Could not clear storage:", storageError);
        }
      }
      
      console.log("Using API endpoint to avoid client-side issues...");
      
      // Use API endpoint instead of direct client call
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validatedData,
          referralCode: referralCode || undefined
        }),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      // Success - redirect to login
      const next = search.get("next") || "/login?message=Account created successfully. Please log in.";
      router.push(next);
      return; // Exit early on success
    } catch (err: any) {
      console.error("Signup error:", err);
      
      // Handle validation errors
      if (err.name === "ZodError") {
        setError(err.errors[0]?.message || "Invalid input");
        return;
      }
      
      // Handle common Supabase auth errors
      let message = err.message || "Signup failed";
      
      if (message.includes("User already registered") || message.includes("already been registered")) {
        message = "This email is already registered. Try logging in instead.";
      } else if (message.includes("Invalid login credentials")) {
        message = "Please check your email and password.";
      } else if (message.includes("Email not confirmed")) {
        message = "Please check your email and click the confirmation link.";
      } else if (message.includes("split is not a function") || message.includes("attributes")) {
        message = "There was an issue with the signup process. Please try again.";
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
                  <Star className="h-4 w-4 mr-2" />
                  #1 Crypto Earning Platform
                </Badge>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                  Start Your
                  <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    Crypto Journey
                  </span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Join <span className="text-blue-400 font-semibold">50,000+</span> investors earning 
                  <span className="text-green-400 font-semibold"> 1-3% daily returns</span> through our 
                  AI-powered USDT investment platform.
                </p>
              </div>

              {/* Features */}
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-gray-300">Secure USDT TRC20 deposits</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Bank-level security & encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-gray-300">24/7 customer support</span>
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
                    <CardTitle className="text-2xl text-white">Create Your Account</CardTitle>
                    <CardDescription className="text-gray-400">
                      Join the crypto earning revolution
                    </CardDescription>
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <div className="text-center">
                        <p className="text-green-300 font-semibold text-lg">
                          Get $5 FREE Welcome Bonus!
                        </p>
                        <p className="text-green-400 text-sm">
                          Start earning immediately upon signup
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 border-green-500/30 mx-auto">
                    <Bitcoin className="h-4 w-4 mr-2" />
                    USDT Investment Platform
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
                      <label htmlFor="password" className="text-sm font-medium text-white">Password</label>
                      <PasswordInput 
                        id="password" 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        placeholder="Create a strong password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-white">Confirm Password</label>
                      <PasswordInput 
                        id="confirmPassword" 
                        required 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 ${
                          confirmPassword && password !== confirmPassword ? 'border-red-500' : 
                          confirmPassword && password === confirmPassword ? 'border-green-500' : ''
                        }`}
                        placeholder="Confirm your password"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-400">Passwords do not match</p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs text-green-400">✓ Passwords match</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="referralCode" className="text-sm font-medium text-white">
                        Referral Code <span className="text-gray-400">(Optional)</span>
                      </label>
                      <Input 
                        id="referralCode" 
                        type="text" 
                        placeholder="Enter referral code"
                        value={referralCode} 
                        onChange={(e) => handleReferralCodeChange(e.target.value)}
                        className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 ${
                          referralValid === true ? "border-green-500" : 
                          referralValid === false ? "border-red-500" : ""
                        }`}
                      />
                      {referralValid === true && referrerInfo && (
                        <div className="flex items-center gap-2 p-2 bg-green-900/20 border border-green-700/50 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <p className="text-xs text-green-300">Valid referral code from {referrerInfo.email}</p>
                        </div>
                      )}
                      {referralValid === false && referralCode.length >= 3 && (
                        <p className="text-xs text-red-400">✗ Invalid referral code</p>
                      )}
                    </div>
                    
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
                      disabled={loading || password !== confirmPassword}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Create Account & Start Earning
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-400">
                        Already have an account?{" "}
                        <Link 
                          className="text-blue-400 hover:text-blue-300 underline font-medium" 
                          href="/login"
                        >
                          Sign in here
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
