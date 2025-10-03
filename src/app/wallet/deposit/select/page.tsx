"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Wallet, 
  ArrowLeft,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  TrendingUp,
  Globe,
  Smartphone
} from "lucide-react";
import { Suspense } from "react";

function DepositSelectContent() {
  const search = useSearchParams();
  const router = useRouter();
  const amount = search.get("amount") || "";
  const planName = search.get("plan");

  const handleNOWPayments = () => {
    const params = new URLSearchParams();
    if (amount) params.set("amount", amount);
    if (planName) params.set("plan", planName);
    router.push(`/wallet/deposit/nowpayments?${params.toString()}`);
  };

  const handleHotWallet = () => {
    const params = new URLSearchParams();
    if (amount) params.set("amount", amount);
    if (planName) params.set("plan", planName);
    router.push(`/wallet/deposit/hotwallet?${params.toString()}`);
  };

  const handleCentralizedDeposit = () => {
    const params = new URLSearchParams();
    if (amount) params.set("amount", amount);
    if (planName) params.set("plan", planName);
    router.push(`/wallet/deposit/centralized?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-slate-700/50" asChild>
                <Link href="/wallet">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Wallet
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Choose Your 
              <span className="block sm:inline bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Deposit Method
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              {planName ? `Select how you want to deposit for your ${planName} plan` : 'Choose your preferred deposit method to add USDT to your wallet'}
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-500/30 px-4 py-2 rounded-full">
            <Zap className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Secure & Instant</span>
          </div>
        </div>

        {/* Amount Display */}
        {amount && (
          <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-sm text-blue-300 mb-2">Deposit Amount</div>
                <div className="text-3xl font-bold text-white">${amount} USDT</div>
                {planName && (
                  <div className="text-sm text-blue-300 mt-2">for {planName} Plan</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* NOWPayments Option */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm hover:border-green-500/50 transition-all duration-300 group cursor-pointer" onClick={handleNOWPayments}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 group-hover:border-green-400/50 transition-colors">
                  <CreditCard className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white group-hover:text-green-300 transition-colors">NOWPayments</CardTitle>
                  <CardDescription className="text-gray-400">Traditional crypto payment gateway</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Multiple payment methods</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Global payment processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Enterprise-grade security</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">5-15 minutes processing</span>
                </div>
              </div>
              
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                <div className="text-sm text-green-300 font-medium">Best for beginners</div>
                <div className="text-xs text-green-400 mt-1">
                  Easy-to-use interface with guided payment process
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold"
                onClick={handleNOWPayments}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Continue with NOWPayments
              </Button>
            </CardContent>
          </Card>

          {/* Hot Wallet Option */}
            {/* Hot Wallet - Temporarily Disabled */}
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 backdrop-blur-sm opacity-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-gray-600/20 border border-gray-600/30">
                      <Wallet className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-400">Hot Wallet</CardTitle>
                      <CardDescription className="text-gray-500">
                        Direct wallet-to-wallet transfer
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Coming Soon
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <div className="text-sm text-yellow-300">
                    <span className="font-medium">🚧 Under Development</span>
                    <br />
                    We're implementing a new centralized deposit system for better user experience.
                  </div>
                </div>

                <Button 
                  disabled
                  className="w-full bg-gray-600 text-gray-400 cursor-not-allowed"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Temporarily Disabled
                </Button>
              </CardContent>
            </Card>
        </div>

        {/* Comparison Table */}
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white">Method Comparison</CardTitle>
            <CardDescription className="text-gray-400">Choose the method that best fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 text-gray-300">Feature</th>
                    <th className="text-center py-3 text-green-300">NOWPayments</th>
                    <th className="text-center py-3 text-purple-300">Hot Wallet</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b border-slate-800">
                    <td className="py-3 text-gray-300">Processing Time</td>
                    <td className="text-center py-3 text-yellow-400">5-15 minutes</td>
                    <td className="text-center py-3 text-green-400">Instant</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 text-gray-300">Setup Required</td>
                    <td className="text-center py-3 text-green-400">None</td>
                    <td className="text-center py-3 text-yellow-400">Wallet App</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 text-gray-300">Network Fees</td>
                    <td className="text-center py-3 text-blue-400">Included</td>
                    <td className="text-center py-3 text-green-400">Lower</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 text-gray-300">User Experience</td>
                    <td className="text-center py-3 text-green-400">Beginner-friendly</td>
                    <td className="text-center py-3 text-purple-400">Advanced</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Shield className="h-6 w-6 text-blue-400 mt-1" />
              <div>
                <div className="text-lg font-semibold text-blue-200 mb-2">Security & Trust</div>
                <div className="text-sm text-blue-300 space-y-1">
                  <p>• Both methods use enterprise-grade encryption and security protocols</p>
                  <p>• All transactions are monitored and verified on the blockchain</p>
                  <p>• Your funds are protected by multi-layer security systems</p>
                  <p>• 24/7 support available for any deposit-related questions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function DepositSelectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositSelectContent />
    </Suspense>
  );
}
