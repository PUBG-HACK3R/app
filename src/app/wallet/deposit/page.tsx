"use client";

import * as React from "react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  DollarSign,
  Zap,
  Shield,
  TrendingUp,
  Wallet
} from "lucide-react";

function DepositContent() {
  const search = useSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState(search.get("amount") || "");
  const [error, setError] = useState("");
  const planName = search.get("plan");

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setError("");
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (numAmount < 12) {
      setError("Minimum deposit amount is $12 USDT");
      return;
    }

    const params = new URLSearchParams();
    params.set("amount", amount);
    if (planName) params.set("plan", planName);
    
    router.push(`/wallet/deposit/select?${params.toString()}`);
  };

  const quickAmounts = [12, 25, 50, 100, 250, 500];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-slate-700/50" asChild>
              <Link href="/wallet">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Wallet
              </Link>
            </Button>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-300 font-medium">Secure & Instant</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 w-fit">
              <Wallet className="h-8 w-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-white">Deposit USDT</CardTitle>
            <CardDescription className="text-gray-400">
              Add funds to your investment wallet
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white">Deposit Amount (USDT)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount (min $12)"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder-gray-400"
                  min="12"
                  step="0.01"
                />
              </div>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="space-y-2">
              <Label className="text-white">Quick Select</Label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAmountChange(quickAmount.toString())}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    ${quickAmount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Instant processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-300">Bank-grade security</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">Start earning immediately</span>
              </div>
            </div>

            {/* Continue Button */}
            <Button 
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3"
              disabled={!amount || parseFloat(amount) < 12}
            >
              Continue to Payment Methods
            </Button>

            {/* Info */}
            <div className="text-center text-sm text-gray-400">
              Minimum deposit: $12 USDT • Maximum: No limit
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositContent />
    </Suspense>
  );
}
