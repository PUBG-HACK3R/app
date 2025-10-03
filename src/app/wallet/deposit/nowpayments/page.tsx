"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Shield, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  DollarSign,
  Zap,
  Lock,
  Globe,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { Suspense } from "react";

function NOWPaymentsDepositContent() {
  const search = useSearchParams();
  const [amount, setAmount] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [minAmount, setMinAmount] = React.useState<number>(12);
  const [loadingMinAmount, setLoadingMinAmount] = React.useState(true);

  React.useEffect(() => {
    const qAmount = search.get("amount");
    if (qAmount) setAmount(qAmount);
    
    // Fetch current minimum amount
    fetchMinAmount();
  }, [search]);

  async function fetchMinAmount() {
    try {
      setLoadingMinAmount(true);
      const res = await fetch("/api/nowpayments/min-amount?currency_from=usd&currency_to=usdttrc20");
      const data = await res.json();
      
      if (res.ok && data.min_amount) {
        const fetchedMinAmount = Math.ceil(parseFloat(data.min_amount));
        setMinAmount(fetchedMinAmount);
        console.log("Updated minimum amount:", fetchedMinAmount);
      }
    } catch (err) {
      console.warn("Failed to fetch minimum amount, using default:", err);
    } finally {
      setLoadingMinAmount(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const plan = search.get("plan") ?? undefined;
      const payload = {
        amount: parseFloat(amount),
        payCurrency: process.env.NEXT_PUBLIC_NOWPAYMENTS_CURRENCY || "usdttrc20",
        priceCurrency: "usd",
        planId: plan,
      };
      
      console.log("Creating invoice with payload:", payload);
      
      const res = await fetch("/api/nowpayments/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      console.log("API Response:", { status: res.status, data });
      
      if (!res.ok) {
        console.error("API Error:", data);
        
        // Handle minimum amount errors specifically
        if (data.min_amount && data.requested_amount) {
          const suggestedAmount = Math.ceil(parseFloat(data.min_amount));
          setMinAmount(suggestedAmount);
          throw new Error(`Minimum deposit is $${suggestedAmount} USDT. Please increase your amount.`);
        }
        
        throw new Error(data.error || `API Error: ${res.status}`);
      }
      
      if (data.invoice_url) {
        console.log("Redirecting to:", data.invoice_url);
        window.location.href = data.invoice_url as string;
      } else {
        console.error("No invoice_url in response:", data);
        throw new Error("No invoice_url returned by server");
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const planName = search.get("plan");
  const suggestedAmounts = React.useMemo(() => {
    const baseAmounts = [25, 50, 100, 200, 500, 1000];
    return [minAmount, ...baseAmounts.filter(amt => amt > minAmount)];
  }, [minAmount]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-slate-700/50" asChild>
                <Link href="/wallet/deposit/select">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Deposit Options
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              NOWPayments 
              <span className="block sm:inline bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Deposit
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              {planName ? `Deposit USDT via NOWPayments for your ${planName} investment plan` : 'Add USDT to your wallet using our secure payment gateway'}
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-500/30 px-4 py-2 rounded-full">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Secure Gateway</span>
          </div>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Deposit Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30">
                    <CreditCard className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">USDT Deposit Amount</CardTitle>
                    <CardDescription className="text-gray-400">Enter the amount you want to deposit via NOWPayments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label htmlFor="amount" className="text-sm font-medium text-white">
                        Investment Amount (USDT) - Minimum ${loadingMinAmount ? "..." : `$${minAmount}`}
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="amount"
                          type="number"
                          min={minAmount.toString()}
                          step="0.01"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Minimum $${minAmount} USDT`}
                          className="pl-10 text-lg h-12 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-green-500"
                        />
                      </div>
                    </div>
                    
                    {/* Quick Amount Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white">Quick Select Amounts</label>
                      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
                        {suggestedAmounts.map((amt) => (
                          <Button
                            key={amt}
                            type="button"
                            variant={amount === amt.toString() ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAmount(amt.toString())}
                            className={`min-w-[80px] ${
                              amount === amt.toString() 
                                ? "bg-gradient-to-r from-green-500 to-blue-500 text-white" 
                                : "border-slate-600 text-gray-300 hover:bg-slate-700/50 hover:text-white"
                            }`}
                          >
                            ${amt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Minimum Amount Info */}
                  <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-700/50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-200">
                        Minimum Deposit: ${loadingMinAmount ? "Loading..." : `$${minAmount} USDT`}
                      </div>
                      <div className="text-xs text-blue-300 mt-1">
                        This minimum is set by NOWPayments to cover TRC20 network fees and ensure efficient blockchain processing.
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-700/50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <div className="flex-1">
                        <p className="text-sm text-red-300">{error}</p>
                        {parseFloat(amount || "0") < minAmount && (
                          <div className="mt-2">
                            <p className="text-xs text-red-400">
                              USDT TRC20 has a minimum deposit of ${minAmount} due to network fees and processing costs.
                            </p>
                            <button
                              type="button"
                              onClick={() => setAmount(minAmount.toString())}
                              className="text-xs text-blue-400 hover:text-blue-300 underline mt-1"
                            >
                              Set to minimum amount (${minAmount})
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={loading || !amount || parseFloat(amount) < minAmount}
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Secure Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Proceed to NOWPayments
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-white">
                  <Globe className="mr-2 h-5 w-5 text-blue-400" />
                  NOWPayments Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="font-medium text-white">Supported Currency</div>
                      <div className="text-sm text-gray-400">USDT (TRC20)</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <div className="font-medium text-white">Processing Time</div>
                      <div className="text-sm text-gray-400">5-15 minutes</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="font-medium text-white">Security</div>
                      <div className="text-sm text-gray-400">Enterprise-grade encryption</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">Global Support</div>
                      <div className="text-sm text-gray-400">Worldwide availability</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investment Summary */}
            {planName && amount && parseFloat(amount) > 0 && (
              <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Investment Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-300">Plan</span>
                    <span className="font-medium text-white capitalize">{planName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-300">Investment</span>
                    <span className="font-medium text-green-400">${parseFloat(amount).toFixed(2)} USDT</span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex items-center space-x-2 p-2 bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-300">Start earning daily crypto returns after deposit</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Features */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-white">
                  <Shield className="mr-2 h-5 w-5 text-blue-400" />
                  Security & Trust
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">SSL Encrypted Payments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">NOWPayments Integration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Real-time Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Automated Confirmation</span>
                  </div>
                </div>
                
                <Separator className="bg-slate-700" />
                
                <div className="text-xs text-gray-400">
                  Your USDT payment is processed through our secure blockchain partner NOWPayments. 
                  All transactions are encrypted and monitored for security.
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className="text-sm font-medium text-white">Need Help?</div>
                  <div className="text-xs text-orange-200">
                    Our support team is available 24/7 to assist with your deposit.
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function NOWPaymentsDepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NOWPaymentsDepositContent />
    </Suspense>
  );
}
