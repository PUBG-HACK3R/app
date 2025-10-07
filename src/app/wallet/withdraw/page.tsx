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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900 overflow-hidden">
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg space-y-4">
            {/* Status Messages */}
            {message && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-300 font-medium text-sm">{message}</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-300 font-medium text-sm">{error}</span>
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
      </div>
    </main>
  );
}
