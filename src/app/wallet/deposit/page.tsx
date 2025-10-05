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

    // No minimum deposit limit - removed

    const params = new URLSearchParams();
    params.set("amount", amount);
    if (planName) params.set("plan", planName);
    
    router.push(`/wallet/deposit/centralized?${params.toString()}`);
  };

  const quickAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 pt-16 pb-20">
      <div className="px-4 py-6 space-y-6">

        {/* Page Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Add Money</h1>
          <p className="text-gray-400">Deposit USDT to start investing</p>
        </div>

        {/* Deposit Form */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-gray-700/30 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-lg font-semibold text-white">How much do you want to add?</div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-12 pr-4 py-4 text-xl font-semibold text-white bg-gray-700/50 border-gray-600 rounded-2xl text-center"
                min="0.01"
                step="0.01"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-3 text-center">Quick amounts</div>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="outline"
                  onClick={() => handleAmountChange(quickAmount.toString())}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white py-3 rounded-xl"
                >
                  ${quickAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-4 rounded-2xl text-lg"
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Continue
          </Button>

          {/* Simple Info */}
          <div className="text-center text-sm text-gray-400 mt-4">
            Secure • Instant • No fees
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositContent />
    </Suspense>
  );
}
