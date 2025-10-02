"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ParticleBackground, 
  FloatingCryptoIcons, 
  GlowingBorder 
} from "@/components/crypto-animations";
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Key,
  Coins
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Password reset failed');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900 relative overflow-hidden">
        {/* Background Effects */}
        <ParticleBackground />
        <FloatingCryptoIcons />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-crypto-pulse"></div>
        
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
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
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-green-500/20">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
                    <CardDescription className="text-gray-400">
                      Password reset instructions sent
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <p className="text-green-300 text-sm">
                        We've sent password reset instructions to:
                      </p>
                      <p className="text-white font-medium mt-1">{email}</p>
                    </div>
                    
                    <div className="text-sm text-gray-400 space-y-2">
                      <p>Please check your email and click the reset link to create a new password.</p>
                      <p>If you don't see the email, check your spam folder.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => router.push('/login')}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSuccess(false);
                        setEmail("");
                      }}
                      className="w-full border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      Send Another Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </GlowingBorder>
          </div>
        </div>
      </main>
    );
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
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2">
                  <Key className="h-4 w-4 mr-2" />
                  Secure Account Recovery
                </Badge>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                  Reset Your
                  <span className="block bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                    Password
                  </span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Secure password recovery for your crypto investment account. 
                  We'll send you a secure link to reset your password.
                </p>
              </div>

              {/* Security Features */}
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Bank-level security protocols</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Lock className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-gray-300">Encrypted email delivery</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <Key className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-gray-300">Time-limited reset tokens</span>
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
                    <CardTitle className="text-2xl text-white">Forgot Password?</CardTitle>
                    <CardDescription className="text-gray-400">
                      Enter your email to receive reset instructions
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30 mx-auto">
                    <Mail className="h-4 w-4 mr-2" />
                    Secure Recovery
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
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-orange-500"
                        placeholder="Enter your registered email"
                      />
                    </div>
                    
                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <p className="text-sm text-red-300">{error}</p>
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending Reset Email...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Reset Instructions
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center space-y-3">
                      <p className="text-sm text-gray-400">
                        Remember your password?{" "}
                        <Link 
                          className="text-blue-400 hover:text-blue-300 underline font-medium" 
                          href="/login"
                        >
                          Sign in here
                        </Link>
                      </p>
                      
                      <p className="text-sm text-gray-400">
                        Don&apos;t have an account?{" "}
                        <Link 
                          className="text-green-400 hover:text-green-300 underline font-medium" 
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
