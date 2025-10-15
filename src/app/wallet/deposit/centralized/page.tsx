"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import NowPaymentsDeposit from "@/components/wallet/nowpayments-deposit";
import { NeedHelpButton } from "@/components/need-help-button";

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900 overflow-hidden">
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            {/* NowPayments Deposit Component */}
            <NowPaymentsDeposit
              amount={parseFloat(amount) || undefined}
              planId={planName || undefined}
              onSuccess={handleSuccess}
              onError={handleError}
            />

            {/* Need Help Button */}
            <div className="text-center pt-6">
              <NeedHelpButton 
                variant="outline" 
                className="border-blue-600/50 text-blue-300 hover:bg-blue-600/20"
              />
            </div>
          </div>
        </div>
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
