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

function DepositContent() {
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
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/wallet">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Wallet
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Fund Your Investment</h1>
          <p className="text-muted-foreground">
            {planName ? `Deposit funds to activate your ${planName} investment plan` : 'Add USDT to your wallet to start investing'}
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-950/20 px-4 py-2 rounded-full">
          <Zap className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Instant Processing</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Deposit Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Deposit Amount</CardTitle>
                  <CardDescription>Enter the amount you want to invest in USDT</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="amount" className="text-sm font-medium">
                      Investment Amount (USDT) - Minimum ${loadingMinAmount ? "..." : `$${minAmount}`}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        min={minAmount.toString()}
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`Minimum $${minAmount} USDT`}
                        className="pl-10 text-lg h-12"
                      />
                    </div>
                  </div>
                  
                  {/* Quick Amount Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Select</label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedAmounts.map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant={amount === amt.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAmount(amt.toString())}
                          className="min-w-[80px]"
                        >
                          ${amt}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Minimum Amount Info */}
                <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Minimum Deposit: ${loadingMinAmount ? "Loading..." : `$${minAmount} USDT`}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      This minimum is set by NOWPayments to cover network fees and ensure efficient processing of USDT TRC20 transactions.
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      {parseFloat(amount || "0") < minAmount && (
                        <div className="mt-2">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            USDT TRC20 has a minimum deposit of ${minAmount} due to network fees and processing costs.
                          </p>
                          <button
                            type="button"
                            onClick={() => setAmount(minAmount.toString())}
                            className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Secure Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Supported Currency</div>
                    <div className="text-sm text-muted-foreground">USDT (TRC20)</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Processing Time</div>
                    <div className="text-sm text-muted-foreground">Instant confirmation</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Network Fees</div>
                    <div className="text-sm text-muted-foreground">Covered by platform</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Security</div>
                    <div className="text-sm text-muted-foreground">Bank-level encryption</div>
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900 dark:text-blue-100">Investment Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Plan</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100 capitalize">{planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Investment</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <Separator className="bg-blue-200 dark:bg-blue-800" />
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">Start earning daily returns after deposit</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Features */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Shield className="mr-2 h-5 w-5 text-blue-500" />
                Security & Trust
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span className="text-sm">SSL Encrypted Payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm">NOWPayments Integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Real-time Processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Automated Confirmation</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-xs text-muted-foreground">
                Your payment is processed through our secure payment partner NOWPayments. 
                All transactions are encrypted and monitored for security.
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <div className="text-sm font-medium">Need Help?</div>
                <div className="text-xs text-muted-foreground">
                  Our support team is available 24/7 to assist with your deposit.
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositContent />
    </Suspense>
  );
}
