"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  TrendingDown,
  Clock,
  Shield
} from "lucide-react";

interface TraditionalWithdrawalProps {
  balance: number;
  onSuccess: (withdrawalId: string) => void;
  onError: (error: string) => void;
}

export default function TraditionalWithdrawal({ balance, onSuccess, onError }: TraditionalWithdrawalProps) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("BEP20");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const networks = [
    { value: "BEP20", label: "BSC (BEP20)", fee: 0 }
  ];

  const platformFee = 0.05; // 5%
  const networkFee = 0; // No network fee for BEP20

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

    // Validate address format based on network
    if (!isValidAddress(address, network)) {
      onError(`Please enter a valid ${network} address`);
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
          network: network,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit withdrawal request");
      }

      onSuccess(data.withdrawal.id);
      setAmount("");
      setAddress("");
    } catch (error: any) {
      console.error("Withdrawal submission error:", error);
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidAddress = (addr: string, net: string) => {
    if (!addr) return false;
    
    switch (net) {
      case "TRC20":
        return addr.startsWith("T") && addr.length === 34;
      case "ERC20":
      case "BEP20":
      case "ARBITRUM":
        return addr.startsWith("0x") && addr.length === 42;
      default:
        return false;
    }
  };

  const calculateFees = () => {
    if (!amount || isNaN(parseFloat(amount))) return { platformFee: 0, networkFee: 0, total: 0, netAmount: 0 };
    
    const amt = parseFloat(amount);
    const platFee = amt * platformFee;
    const netFee = networkFee;
    const totalFees = platFee + netFee;
    const net = amt - totalFees;
    
    return {
      platformFee: platFee,
      networkFee: netFee,
      total: totalFees,
      netAmount: Math.max(0, net)
    };
  };

  const fees = calculateFees();

  const quickAmounts = [
    Math.min(50, balance),
    Math.min(100, balance),
    Math.min(balance * 0.25, balance),
    Math.min(balance * 0.5, balance),
    balance
  ].filter(amt => amt >= 30);

  return (
    <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <TrendingDown className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Traditional Withdrawal</CardTitle>
            <CardDescription className="text-gray-400">
              Secure withdrawal to your crypto wallet (24-48 hour processing)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Available Balance:</span>
            <span className="text-lg text-green-400 font-bold">${balance.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <Label htmlFor="amount" className="text-white font-medium">
            Withdrawal Amount (USDT) - Minimum $30
          </Label>
          <Input
            id="amount"
            type="number"
            min="30"
            max={balance}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500"
          />
          
          {/* Quick Amount Buttons */}
          {quickAmounts.length > 0 && (
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
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white" 
                        : "border-slate-600 text-gray-300 hover:bg-slate-700/50"
                    }`}
                    disabled={amt < 30}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Network Selection */}
        <div className="space-y-3">
          <Label className="text-white font-medium">Network</Label>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {networks.map((net) => (
                <SelectItem key={net.value} value={net.value} className="text-white hover:bg-slate-700">
                  <div className="flex justify-between items-center w-full">
                    <span>{net.label}</span>
                    <span className="text-xs text-gray-400 ml-2">Fee: ${net.fee}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Address Input */}
        <div className="space-y-3">
          <Label htmlFor="address" className="text-white font-medium">
            Wallet Address ({network})
          </Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={`Enter your ${network} wallet address`}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 font-mono text-sm"
          />
          <div className="text-xs text-gray-400">
            {network === "TRC20" && "Address should start with 'T' (34 characters)"}
            {(network === "ERC20" || network === "BEP20" || network === "ARBITRUM") && "Address should start with '0x' (42 characters)"}
          </div>
        </div>

        {/* Fee Breakdown */}
        {amount && parseFloat(amount) >= 30 && (
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h4 className="text-white font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Fee Breakdown
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Withdrawal Amount:</span>
                <span className="text-white font-medium">${parseFloat(amount).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Platform Fee (5%):</span>
                <span className="text-red-400">-${fees.platformFee.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Network Fee ({network}):</span>
                <span className="text-red-400">-${fees.networkFee.toFixed(2)}</span>
              </div>
              
              <Separator className="bg-slate-600" />
              
              <div className="flex justify-between font-bold">
                <span className="text-gray-300">You'll Receive:</span>
                <span className="text-green-400">${fees.netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button 
          onClick={submitWithdrawal}
          disabled={
            isSubmitting || 
            !amount || 
            !address || 
            parseFloat(amount || "0") < 30 || 
            parseFloat(amount || "0") > balance ||
            fees.netAmount <= 0
          }
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Request...
            </>
          ) : (
            <>
              <TrendingDown className="mr-2 h-4 w-4" />
              Submit Withdrawal Request
            </>
          )}
        </Button>

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">Secure multi-signature processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-gray-300">24-48 hour processing time</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-300">Admin approval required for security</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center">
          All withdrawals are manually reviewed for security. You'll receive email confirmation once processed.
        </div>
      </CardContent>
    </Card>
  );
}
