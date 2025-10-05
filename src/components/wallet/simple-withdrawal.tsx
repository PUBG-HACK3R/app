"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  CheckCircle, 
  Loader2,
  TrendingDown,
  DollarSign
} from "lucide-react";

interface SimpleWithdrawalProps {
  balance: number;
  onSuccess: (withdrawalId: string) => void;
  onError: (error: string) => void;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  address: string;
  status: string;
  created_at: string;
}

export default function SimpleWithdrawal({ balance, onSuccess, onError }: SimpleWithdrawalProps) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [processingMessages, setProcessingMessages] = useState<string[]>([]);

  // Timer for 15-minute processing window
  useEffect(() => {
    if (pendingWithdrawal) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const created = new Date(pendingWithdrawal.created_at).getTime();
        const elapsed = now - created;
        const remaining = Math.max(0, (15 * 60 * 1000) - elapsed); // 15 minutes
        
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          // Auto-complete after 15 minutes
          setPendingWithdrawal(null);
          onSuccess(pendingWithdrawal.id);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [pendingWithdrawal, onSuccess]);

  // Processing messages simulation
  useEffect(() => {
    if (pendingWithdrawal) {
      const messages = [
        "System confirmation in progress...",
        "Blockchain confirmation initiated...", 
        "Network validation processing...",
        "Transaction verification pending...",
        "Awaiting final confirmation...",
        "Processing blockchain verification..."
      ];
      
      let index = 0;
      setProcessingMessages([messages[0]]);
      
      const interval = setInterval(() => {
        index = (index + 1) % messages.length;
        setProcessingMessages(prev => {
          const newMessages = [...prev, messages[index]];
          return newMessages.slice(-3); // Keep only last 3 messages
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [pendingWithdrawal]);

  const submitWithdrawal = async () => {
    if (!amount || !address) {
      onError("Please enter amount and wallet address");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onError("Please enter a valid amount");
      return;
    }

    if (numericAmount < 30) {
      onError("Minimum withdrawal amount is $30 USDT");
      return;
    }

    if (numericAmount > balance) {
      onError("Amount exceeds available balance");
      return;
    }

    if (!address.startsWith("T") || address.length !== 34) {
      onError("Please enter a valid TRC20 address");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/withdrawal-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          address: address,
          network: "TRC20",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit withdrawal request");
      }

      // Start processing simulation
      setPendingWithdrawal({
        id: data.withdrawal.id,
        amount: data.withdrawal.amount,
        address: data.withdrawal.address,
        status: "processing",
        created_at: new Date().toISOString(),
      });

      setAmount("");
      setAddress("");
      
    } catch (error: any) {
      console.error("Withdrawal submission error:", error);
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateFee = (amount: number) => {
    return Math.round(amount * 0.05 * 100) / 100;
  };

  const calculateNetAmount = (amount: number) => {
    return Math.round((amount - calculateFee(amount)) * 100) / 100;
  };

  const quickAmounts = [
    Math.min(50, balance),
    Math.min(100, balance),
    Math.min(balance * 0.25, balance),
    Math.min(balance * 0.5, balance),
    balance
  ].filter(amt => amt >= 30);

  // Show processing status if withdrawal is pending
  if (pendingWithdrawal) {
    return (
      <Card className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <h3 className="text-xl font-bold text-white">Processing Withdrawal</h3>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Amount:</span>
                <span className="font-semibold text-white">${Number(pendingWithdrawal.amount).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Fee (5%):</span>
                <span className="font-semibold text-red-400">-${calculateFee(Number(pendingWithdrawal.amount)).toFixed(2)} USDT</span>
              </div>
              <Separator className="bg-gray-600" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">You'll Receive:</span>
                <span className="font-bold text-green-400">${calculateNetAmount(Number(pendingWithdrawal.amount)).toFixed(2)} USDT</span>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Processing will complete within 15 minutes
              </p>
              
              {/* Processing Messages */}
              <div className="space-y-2">
                {processingMessages.map((msg, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 dark:text-gray-300">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-xs text-gray-400 text-center">
              Please wait while we process your withdrawal through the blockchain network.
              Do not close this page or refresh your browser.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-gray-700/30 p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingDown className="w-8 h-8 text-orange-400" />
        </div>
        <div className="text-lg font-semibold text-white">How much do you want to withdraw?</div>
        <div className="text-sm text-gray-400 mt-2">Minimum: $30 • Fee: 5% • TRC20 Network</div>
      </div>

      <div className="space-y-6">
        {/* Amount Input */}
        <div>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-12 pr-4 py-4 text-xl font-semibold text-white bg-gray-700/50 border-gray-600 rounded-2xl text-center"
              min="30"
              max={balance}
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Quick Amount Buttons */}
        {quickAmounts.length > 0 && (
          <div>
            <div className="text-sm text-gray-400 mb-3 text-center">Quick amounts</div>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.slice(0, 6).map((amt, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  onClick={() => setAmount(amt.toFixed(2))}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white py-3 rounded-xl"
                  disabled={isSubmitting}
                >
                  ${amt.toFixed(0)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Wallet Address */}
        <div>
          <div className="text-sm text-gray-400 mb-2">Your TRON wallet address</div>
          <Input
            placeholder="TRX address (starts with T...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-gray-700/50 border-gray-600 text-white rounded-2xl py-3"
            disabled={isSubmitting}
          />
        </div>

        {/* Fee Calculation */}
        {amount && parseFloat(amount) >= 30 && (
          <div className="bg-gray-700/30 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="text-white">${parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Fee (5%)</span>
              <span className="text-red-400">-${calculateFee(parseFloat(amount)).toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="flex justify-between">
                <span className="text-gray-400">You'll receive</span>
                <span className="text-green-400 font-semibold">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button 
          onClick={submitWithdrawal}
          disabled={isSubmitting || !amount || !address || (parseFloat(amount || "0") > balance) || parseFloat(amount || "0") < 30}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 rounded-2xl text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Withdraw Now"
          )}
        </Button>

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-gray-300">5% platform fee</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">15-minute processing window</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-300">All withdrawals are processed automatically</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center">
          All withdrawals are processed automatically within 15 minutes
        </div>
      </div>
    </div>
  );
}
