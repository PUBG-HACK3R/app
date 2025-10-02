"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { 
  ParticleBackground, 
  FloatingCryptoIcons, 
  GlowingBorder 
} from "@/components/crypto-animations";
import { 
  Shield, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  Key,
  Coins,
  ArrowRight,
  Zap
} from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get access token from URL
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  React.useEffect(() => {
    if (!accessToken) {
      setError("Invalid or expired reset link. Please request a new password reset.");
    }
  }, [accessToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Check password confirmation
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }

      if (!accessToken) {
        setError("Invalid reset link. Please request a new password reset.");
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password,
          accessToken,
          refreshToken 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Password reset failed');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to reset password");
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
                    <CardTitle className="text-2xl text-white">Password Reset Successful!</CardTitle>
                    <CardDescription className="text-gray-400">
                      Your password has been updated successfully
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <p className="text-green-300 text-sm">
                        You can now sign in with your new password to access your crypto investment account.
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => router.push('/login')}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Sign In Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
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
                <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2">
                  <Key className="h-4 w-4 mr-2" />
                  Secure Password Reset
                </Badge>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                  Create New
                  <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    Password
                  </span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Set a strong new password for your crypto investment account. 
                  Your account security is our top priority.
                </p>
              </div>

              {/* Security Features */}
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Shield className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-gray-300">Password encryption at rest</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Lock className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Secure authentication protocols</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <Key className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-gray-300">Account protection measures</span>
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
                    <CardTitle className="text-2xl text-white">Reset Your Password</CardTitle>
                    <CardDescription className="text-gray-400">
                      Enter your new password below
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 border-green-500/30 mx-auto">
                    <Lock className="h-4 w-4 mr-2" />
                    Secure Reset
                  </Badge>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium text-white">New Password</label>
                      <PasswordInput 
                        id="password" 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-green-500"
                        placeholder="Enter your new password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-white">Confirm New Password</label>
                      <PasswordInput 
                        id="confirmPassword" 
                        required 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-green-500 ${
                          confirmPassword && password !== confirmPassword ? 'border-red-500' : 
                          confirmPassword && password === confirmPassword ? 'border-green-500' : ''
                        }`}
                        placeholder="Confirm your new password"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-400">Passwords do not match</p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs text-green-400">✓ Passwords match</p>
                      )}
                    </div>
                    
                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <p className="text-sm text-red-300">{error}</p>
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={loading || password !== confirmPassword || !accessToken}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-400">
                        Remember your password?{" "}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
