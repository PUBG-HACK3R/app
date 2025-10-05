"use client";

import * as React from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import SimpleWithdrawal from "@/components/wallet/simple-withdrawal";
import { 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Wallet
} from "lucide-react";

export default function WithdrawPage() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<number | null>(null);


  React.useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) return;
        
        // Fetch user transactions to calculate balance
        const { data: allTx } = await supabase
          .from("transactions")
          .select("type, amount_usdt")
          .eq("user_id", uid);

        const totalEarnings = (allTx || [])
          .filter((t) => t.type === "earning")
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        const totalDeposits = (allTx || [])
          .filter((t) => t.type === "deposit")
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        const totalInvestments = (allTx || [])
          .filter((t) => t.type === "investment")
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        const totalReturns = (allTx || [])
          .filter((t) => t.type === "investment_return")
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        const totalWithdrawals = (allTx || [])
          .filter((t) => t.type === "withdrawal")
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        const walletBalance = totalDeposits + totalEarnings + totalReturns - totalInvestments - totalWithdrawals;
        
        setBalance(walletBalance);
      } catch {}
    })();
  }, []);




  const handleWithdrawalSuccess = (withdrawalId: string) => {
    setMessage("✅ Withdrawal request submitted successfully! It will be processed within 24-48 hours.");
    setError(null);
  };

  const handleWithdrawalError = (errorMessage: string) => {
    setError(errorMessage);
    setMessage(null);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 pt-16 pb-20">
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/wallet" className="flex items-center space-x-2 text-gray-300 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Wallet</span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Mining Withdrawal</h1>
            <p className="text-gray-400">Secure USDT withdrawal to your crypto wallet</p>
          </div>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>

        {/* Status Messages */}
        {message && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 dark:text-green-200 font-medium">{message}</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 dark:text-red-200 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Simple Withdrawal Component */}
        {balance !== null && (
          <SimpleWithdrawal 
            balance={balance}
            onSuccess={handleWithdrawalSuccess}
            onError={handleWithdrawalError}
          />
        )}
        
        {balance === null && (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading your balance...</p>
          </div>
        )}
      </div>
    </div>
  );
}
