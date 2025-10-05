"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  TrendingDown,
  Copy,
  ExternalLink
} from "lucide-react";
import { ethers } from "ethers";

interface HotWalletWithdrawalProps {
  balance: number;
  onSuccess: (withdrawalId: string) => void;
  onError: (error: string) => void;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  to_address: string;
  status: string;
  created_at: string;
  timeRemaining?: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function HotWalletWithdrawal({ balance, onSuccess, onError }: HotWalletWithdrawalProps) {
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (pendingWithdrawal) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const created = new Date(pendingWithdrawal.created_at).getTime();
        const elapsed = now - created;
        const remaining = Math.max(0, (15 * 60 * 1000) - elapsed); // 15 minutes
        
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          // Check status or timeout
          checkWithdrawalStatus();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [pendingWithdrawal]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setConnectedAddress(accounts[0]);
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      onError("MetaMask is not installed. Please install MetaMask or use TrustWallet.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setConnectedAddress(accounts[0]);
        setWalletAddress(accounts[0]);
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      onError(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const checkWithdrawalStatus = async () => {
    // This would typically check the withdrawal status from your API
    // For now, we'll simulate the check
    console.log("Checking withdrawal status...");
  };

  const submitWithdrawal = async () => {
    if (!amount || !walletAddress) {
      onError("Please enter amount and wallet address");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onError("Please enter a valid amount");
      return;
    }

    if (numericAmount < 10) {
      onError("Minimum withdrawal amount is $10 USDT");
      return;
    }

    if (numericAmount > balance) {
      onError("Amount exceeds available balance");
      return;
    }

    if (!ethers.isAddress(walletAddress)) {
      onError("Please enter a valid wallet address");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/hotwallet-withdraw-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          toAddress: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit withdrawal request");
      }

      setPendingWithdrawal({
        id: data.withdrawal.id,
        amount: data.withdrawal.amount,
        to_address: data.withdrawal.to_address,
        status: data.withdrawal.status,
        created_at: data.withdrawal.created_at,
      });

      onSuccess(data.withdrawal.id);
      setAmount("");
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

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const quickAmounts = [
    Math.min(50, balance),
    Math.min(100, balance),
    Math.min(balance * 0.25, balance),
    Math.min(balance * 0.5, balance),
    balance
  ].filter(amt => amt >= 10);

  if (pendingWithdrawal) {
    return (
      <Card className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
              <Clock className="h-6 w-6 text-orange-400 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Processing Withdrawal</CardTitle>
              <CardDescription className="text-gray-400">
                Your hot wallet withdrawal is being processed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Amount:</span>
              <span className="text-sm text-white font-semibold">${Number(pendingWithdrawal.amount).toFixed(2)} USDT</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Fee (3%):</span>
              <span className="text-sm text-red-400 font-semibold">-${(Number(pendingWithdrawal.amount) * 0.03).toFixed(2)} USDT</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">You'll Receive:</span>
              <span className="text-sm text-green-400 font-bold">${(Number(pendingWithdrawal.amount) * 0.97).toFixed(2)} USDT</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">To Address:</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white font-mono">
                  {pendingWithdrawal.to_address.slice(0, 6)}...{pendingWithdrawal.to_address.slice(-4)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyAddress(pendingWithdrawal.to_address)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Status:</span>
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                {pendingWithdrawal.status}
              </Badge>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                {formatTime(timeRemaining)}
              </span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
              Processing will complete within 15 minutes
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Verifying withdrawal request...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Preparing blockchain transaction...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Awaiting admin approval...</span>
            </div>
          </div>

          <div className="text-xs text-gray-400 text-center">
            Your withdrawal will be sent directly to your wallet address once approved.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <TrendingDown className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Hot Wallet Withdrawal</CardTitle>
            <CardDescription className="text-gray-400">
              Withdraw directly to your wallet (faster processing)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Available Balance:</span>
            <span className="text-sm text-green-400 font-semibold">${balance.toFixed(2)} USDT</span>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium text-white">
              Withdrawal Amount (USDT) - Minimum $10
            </label>
            <Input
              id="amount"
              type="number"
              min="10"
              max={balance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500"
            />
          </div>

          {quickAmounts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Quick Select</label>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt, index) => {
                  const label = index === quickAmounts.length - 1 ? 'All' : 
                               index === quickAmounts.length - 2 ? '50%' :
                               index === quickAmounts.length - 3 ? '25%' : `$${amt.toFixed(0)}`;
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={amount === amt.toFixed(2) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(amt.toFixed(2))}
                      className={`min-w-[60px] ${
                        amount === amt.toFixed(2) 
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white" 
                          : "border-slate-600 text-gray-300 hover:bg-slate-700/50 hover:text-white"
                      }`}
                      disabled={amt < 10}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium text-white">
              Your Wallet Address
            </label>
            <div className="flex space-x-2">
              <Input
                id="address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... or connect wallet"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500"
              />
              {!connectedAddress ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWalletAddress(connectedAddress)}
                  className="border-green-500/50 text-green-300 hover:bg-green-500/10"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-400">
              Make sure this is a valid Polygon address that supports USDT TRC20
            </div>
          </div>
        </div>

        {amount && parseFloat(amount) >= 10 && walletAddress && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Withdrawal Amount:</span>
              <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Platform Fee (3%):</span>
              <span className="font-medium text-red-600">-${(parseFloat(amount) * 0.03).toFixed(2)}</span>
            </div>
            <Separator className="bg-blue-200 dark:bg-blue-800" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">You'll Receive:</span>
              <span className="font-bold text-green-600">${(parseFloat(amount) * 0.97).toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={submitWithdrawal}
          disabled={isSubmitting || !amount || !walletAddress || parseFloat(amount || "0") < 10 || parseFloat(amount || "0") > balance}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Request...
            </>
          ) : (
            <>
              <TrendingDown className="mr-2 h-4 w-4" />
              Request Hot Wallet Withdrawal
            </>
          )}
        </Button>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-gray-300">3% platform fee</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">15-minute processing window</span>
          </div>
          <div className="flex items-center space-x-2">
            <ExternalLink className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-300">Direct wallet-to-wallet transfer</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center">
          Hot wallet withdrawals are processed faster than traditional methods
        </div>
      </CardContent>
    </Card>
  );
}
