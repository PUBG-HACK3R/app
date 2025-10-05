"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import SimpleDeposit from "@/components/simple-deposit";

function CentralizedDepositContent() {
  const search = useSearchParams();
  const amount = search.get("amount") || "";
  const planName = search.get("plan");

  const handleSuccess = (txHash: string) => {
    console.log("Deposit successful:", txHash);
    // You can add success handling here
  };

  const handleError = (error: string) => {
    console.error("Deposit error:", error);
    // You can add error handling here
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-slate-700/50" asChild>
              <Link href="/wallet/deposit">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Amount
              </Link>
            </Button>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-300 font-medium">Secure & Instant</span>
          </div>
        </div>

        {/* Amount Display */}
        {amount && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Deposit ${amount} USDT
            </h1>
            {planName && (
              <p className="text-gray-400">
                For plan: <span className="text-blue-400 font-medium">{planName}</span>
              </p>
            )}
          </div>
        )}

        {/* Centralized Deposit Component */}
        <SimpleDeposit
          amount={parseFloat(amount) || 0}
        />
      </div>
    </main>
  );
}

export default function CentralizedDepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CentralizedDepositContent />
    </Suspense>
  );
}
