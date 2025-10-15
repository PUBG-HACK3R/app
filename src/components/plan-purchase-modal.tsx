"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Wallet, CreditCard, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PlanPurchaseModalProps {
  planId: string;
  planName: string;
  minAmount: number;
  maxAmount: number;
  dailyRoi: number;
  duration: number;
  gradient: string;
  className?: string;
  onPurchaseSuccess?: () => void;
  children: React.ReactNode;
}

export function PlanPurchaseModal({ 
  planId, 
  planName, 
  minAmount,
  maxAmount,
  dailyRoi,
  duration,
  gradient, 
  className = "",
  onPurchaseSuccess,
  children
}: PlanPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [customAmount, setCustomAmount] = useState<string>(minAmount.toString());
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      // Check if user is authenticated and get balance
      const response = await fetch('/api/user/balance');
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserBalance(data.balance?.available || 0);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsAuthenticated(false);
    }
  };

  const handlePurchase = async () => {
    if (isAuthenticated === false) {
      router.push('/login?next=/plans');
      return;
    }

    if (userBalance === null) {
      await checkUserStatus();
      return;
    }

    const investmentAmount = parseFloat(customAmount);

    // Validate amount
    if (isNaN(investmentAmount) || investmentAmount < minAmount || investmentAmount > maxAmount) {
      toast.error(`Investment amount must be between $${minAmount} and $${maxAmount.toLocaleString()}`);
      return;
    }

    // If insufficient balance, redirect to deposit
    if (userBalance < investmentAmount) {
      router.push(`/wallet/deposit?plan=${planId}&amount=${investmentAmount}`);
      return;
    }

    // Purchase with existing balance
    setLoading(true);
    try {
      const response = await fetch('/api/plans/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          planId,
          customAmount: investmentAmount 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully invested $${investmentAmount} in ${planName}!`);
        setOpen(false);
        // Call the success callback if provided
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        } else {
          // Fallback to page refresh for server-side pages
          router.refresh();
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        if (data.error === 'Insufficient balance') {
          router.push(`/wallet/deposit?plan=${planId}&amount=${investmentAmount}`);
        } else {
          toast.error(data.error || 'Failed to purchase plan');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase plan');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    if (isAuthenticated === false) return "Login to Invest";
    if (userBalance === null) return "Start Investing";
    const investmentAmount = parseFloat(customAmount) || minAmount;
    if (userBalance >= investmentAmount) return "Purchase Now";
    return "Deposit & Purchase";
  };

  const getButtonIcon = () => {
    if (loading) return null;
    if (isAuthenticated === false) return <ArrowRight className="ml-2 h-4 w-4" />;
    if (userBalance === null) return <ArrowRight className="ml-2 h-4 w-4" />;
    const investmentAmount = parseFloat(customAmount) || minAmount;
    if (userBalance >= investmentAmount) return <Wallet className="ml-2 h-4 w-4" />;
    return <CreditCard className="ml-2 h-4 w-4" />;
  };

  const calculateReturns = () => {
    const amount = parseFloat(customAmount) || minAmount;
    const isEndPayoutPlan = duration >= 30; // Monthly and Bi-Monthly plans
    
    let dailyEarning, totalReturn, totalProfit, totalROI;
    
    if (isEndPayoutPlan) {
      // End payout plans: Fixed profit ROI based on duration
      if (duration >= 60) {
        // Bi-Monthly plan: 150% profit ROI (150% profit + 100% principal = 250% total)
        totalROI = 150;
      } else {
        // Monthly plan: 120% profit ROI (120% profit + 100% principal = 220% total)
        totalROI = 120;
      }
      
      totalProfit = (amount * totalROI) / 100; // This is the profit amount
      totalReturn = amount + totalProfit; // Principal + Profit = Total payout
      dailyEarning = 0; // No daily earnings, only at end
    } else {
      // Daily payout plans: traditional daily ROI calculation
      dailyEarning = (amount * dailyRoi) / 100;
      totalReturn = dailyEarning * duration;
      totalProfit = totalReturn; // Daily earnings are pure profit (investment returned at end)
      totalROI = (totalProfit / amount) * 100;
    }
    
    return {
      dailyEarning,
      totalReturn,
      totalProfit,
      totalROI,
      isEndPayoutPlan
    };
  };

  const returns = calculateReturns();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Invest in {planName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your custom investment amount between ${minAmount} and ${maxAmount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Custom Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">Investment Amount (USDT)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min={minAmount}
                max={maxAmount}
                step="0.01"
                className="pl-10 bg-slate-700 border-slate-600 text-white"
                placeholder={`Min: $${minAmount}`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Min: ${minAmount}</span>
              <span>Max: ${maxAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Returns Preview */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-white">Investment Preview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {!returns.isEndPayoutPlan && (
                <div>
                  <div className="text-gray-400">Daily Earning</div>
                  <div className="text-green-400 font-semibold">${returns.dailyEarning.toFixed(2)}</div>
                </div>
              )}
              <div>
                <div className="text-gray-400">Duration</div>
                <div className="text-blue-400 font-semibold">{duration} days</div>
              </div>
              <div>
                <div className="text-gray-400">
                  {returns.isEndPayoutPlan ? 'Total Payout' : 'Total Earnings'}
                </div>
                <div className="text-orange-400 font-semibold">${returns.totalReturn.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400">Total Profit</div>
                <div className="text-yellow-400 font-semibold">+${returns.totalProfit.toFixed(2)} ({returns.totalROI.toFixed(1)}%)</div>
              </div>
            </div>
          </div>

          {/* Balance Info */}
          {userBalance !== null && (
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Your Balance:</span>
                <span className="text-white font-semibold">${userBalance.toFixed(2)}</span>
              </div>
              {userBalance < (parseFloat(customAmount) || minAmount) && (
                <div className="text-red-400 text-xs mt-1">
                  Insufficient balance. You'll be redirected to deposit.
                </div>
              )}
            </div>
          )}

          {/* Purchase Button */}
          <Button 
            size="lg" 
            className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 text-white font-semibold ${className}`}
            onClick={handlePurchase}
            disabled={loading}
          >
            {getButtonText()}
            {getButtonIcon()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
