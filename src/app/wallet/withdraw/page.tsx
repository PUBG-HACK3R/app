"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { 
  PiggyBank, 
  Shield, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Wallet,
  Copy,
  ExternalLink,
  Info,
  TrendingDown,
  User
} from "lucide-react";

export default function WithdrawPage() {
  const [amount, setAmount] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [withdrawals, setWithdrawals] = React.useState<any[]>([]);
  const [activeWithdrawal, setActiveWithdrawal] = React.useState<any>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<number>(0);
  const [processingMessages, setProcessingMessages] = React.useState<string[]>([]);
  const [showProcessing, setShowProcessing] = React.useState(false);

  const fetchWithdrawals = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;

      // Fetch user withdrawals
      const { data: withdrawalData } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);

      setWithdrawals(withdrawalData || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    }
  };

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
        const totalWithdrawals = (allTx || [])
          .filter((t) => t.type === "withdrawal")
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        const walletBalance = totalDeposits + totalEarnings - totalWithdrawals;
        
        setBalance(walletBalance);

        // Fetch user withdrawals
        const { data: withdrawalData } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(10);

        setWithdrawals(withdrawalData || []);
        
        // Check for active pending withdrawal
        const pendingWithdrawal = (withdrawalData || []).find(w => w.status === "pending" && w.expires_at);
        if (pendingWithdrawal) {
          setActiveWithdrawal(pendingWithdrawal);
          setShowProcessing(true);
        }
      } catch {}
    })();
  }, []);

  // Countdown timer effect and status polling
  React.useEffect(() => {
    if (!activeWithdrawal || !activeWithdrawal.expires_at) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(activeWithdrawal.expires_at).getTime();
      const remaining = Math.max(0, expires - now);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        handleTimeout();
      }
    };
    
    // Check withdrawal status every 5 seconds
    const checkStatus = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: withdrawal } = await supabase
          .from("withdrawals")
          .select("status")
          .eq("id", activeWithdrawal.id)
          .single();
        
        if (withdrawal && withdrawal.status === "approved") {
          // Admin approved the withdrawal
          setActiveWithdrawal(null);
          setShowProcessing(false);
          setMessage("✅ Withdrawal completed successfully! Your funds have been sent to your wallet.");
          await fetchWithdrawals();
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    };
    
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    const statusInterval = setInterval(checkStatus, 5000);
    
    return () => {
      clearInterval(timerInterval);
      clearInterval(statusInterval);
    };
  }, [activeWithdrawal]);

  // Processing messages simulation
  React.useEffect(() => {
    if (!showProcessing) return;
    
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
  }, [showProcessing]);

  async function handleTimeout() {
    if (!activeWithdrawal) return;
    
    try {
      const res = await fetch("/api/withdraw/timeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId: activeWithdrawal.id }),
      });
      
      if (res.ok) {
        setActiveWithdrawal(null);
        setShowProcessing(false);
        setError("Blockchain error - please try again");
        // Refresh withdrawals list
        await fetchWithdrawals();
      }
    } catch (err) {
      console.error("Timeout handling error:", err);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const amt = parseFloat(amount);
      if (!isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
      if (amt < 30) throw new Error("Minimum withdrawal amount is $30");
      if (balance !== null && amt > balance) throw new Error("Amount exceeds available balance");
      
      const res = await fetch("/api/withdraw/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit withdrawal request");
      
      // Start processing flow
      setActiveWithdrawal(data.withdrawal);
      setShowProcessing(true);
      setAmount("");
      setAddress("");
      setMessage("Withdrawal request submitted successfully! Processing has started.");
      
      // Refresh withdrawals list
      await fetchWithdrawals();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const quickAmounts = balance !== null ? [
    Math.min(50, balance),
    Math.min(100, balance),
    Math.min(balance * 0.25, balance),
    Math.min(balance * 0.5, balance),
    balance
  ].filter(amt => amt >= 30) : [];

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
          <h1 className="text-3xl font-bold tracking-tight">Withdraw Funds</h1>
          <p className="text-muted-foreground">
            Request a withdrawal from your available balance
          </p>
        </div>
        {balance !== null && (
          <div className="hidden md:flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/20 px-4 py-2 rounded-full">
            <Wallet className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Available: ${balance.toFixed(2)} USDT
            </span>
          </div>
        )}
        {showProcessing && (
          <Badge variant="outline" className="text-orange-600 border-orange-600 animate-pulse">
            Processing Active
          </Badge>
        )}
      </div>

      {/* Processing Status Modal */}
      {showProcessing && activeWithdrawal && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">Processing Withdrawal</h3>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="font-semibold">${Number(activeWithdrawal.amount_usdt).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fee (5%):</span>
                  <span className="font-semibold text-red-600">-${Number(activeWithdrawal.fee_usdt || 0).toFixed(2)} USDT</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">You'll Receive:</span>
                  <span className="font-bold text-green-600">${Number(activeWithdrawal.net_amount_usdt || 0).toFixed(2)} USDT</span>
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
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Please wait while we process your withdrawal through the blockchain network.
                Do not close this page or refresh your browser.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Withdrawal Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance Overview */}
          {balance !== null && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Available Balance</div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">${balance.toFixed(2)} USDT</div>
                    </div>
                  </div>
                  {balance < 30 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Minimum $30 required
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <PiggyBank className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Withdrawal Request</CardTitle>
                  <CardDescription>Enter withdrawal amount and your TRC20 wallet address</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="amount" className="text-sm font-medium">Withdrawal Amount (USDT)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        min="30"
                        max={balance || undefined}
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount (min $30)"
                        className="pl-10 text-lg h-12"
                        disabled={showProcessing}
                      />
                    </div>
                    {balance !== null && amount && parseFloat(amount) > balance && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Amount exceeds available balance</span>
                      </div>
                    )}
                    {amount && parseFloat(amount) < 30 && (
                      <div className="flex items-center space-x-2 text-orange-600">
                        <Info className="h-4 w-4" />
                        <span className="text-sm">Minimum withdrawal amount is $30</span>
                      </div>
                    )}
                    {amount && parseFloat(amount) >= 30 && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Withdrawal Amount:</span>
                          <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Processing Fee (5%):</span>
                          <span className="font-medium text-red-600">-${calculateFee(parseFloat(amount)).toFixed(2)}</span>
                        </div>
                        <Separator className="bg-blue-200 dark:bg-blue-800" />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">You'll Receive:</span>
                          <span className="font-bold text-green-600">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Amount Selection */}
                  {quickAmounts.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quick Select</label>
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
                              className="min-w-[60px]"
                              disabled={amt < 30 || showProcessing}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="address" className="text-sm font-medium">TRC20 Wallet Address</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="T..."
                        className="pl-10 h-12"
                        disabled={showProcessing}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Make sure this is a valid TRC20 USDT address. Withdrawals to incorrect addresses cannot be recovered.
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading || showProcessing || (balance !== null && !!amount && (parseFloat(amount) > balance || parseFloat(amount) < 30)) || !address}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting Request...
                    </>
                  ) : showProcessing ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Processing Active
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Submit Withdrawal Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>


          {/* Withdrawal History */}
          {withdrawals.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Recent Withdrawals</CardTitle>
                    <CardDescription>Your latest withdrawal requests and their status</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {withdrawals.map((withdrawal) => {
                    const statusColor = 
                      withdrawal.status === 'approved' ? 'text-green-600 bg-green-50 dark:bg-green-950/20' :
                      withdrawal.status === 'rejected' ? 'text-red-600 bg-red-50 dark:bg-red-950/20' :
                      'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
                    
                    const statusIcon = 
                      withdrawal.status === 'approved' ? <CheckCircle className="h-4 w-4" /> :
                      withdrawal.status === 'rejected' ? <AlertCircle className="h-4 w-4" /> :
                      <Clock className="h-4 w-4" />;

                    return (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium">${Number(withdrawal.amount_usdt).toFixed(2)} USDT</div>
                            <div className="text-sm text-muted-foreground">
                              To: {withdrawal.address.slice(0, 8)}...{withdrawal.address.slice(-6)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(withdrawal.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${statusColor} border-0`}>
                            <div className="flex items-center space-x-1">
                              {statusIcon}
                              <span className="capitalize">{withdrawal.status}</span>
                            </div>
                          </Badge>
                          {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                            <div className="text-xs text-red-600 mt-1 max-w-[200px]">
                              {withdrawal.rejection_reason}
                            </div>
                          )}
                          {withdrawal.status === 'approved' && withdrawal.approved_at && (
                            <div className="text-xs text-green-600 mt-1">
                              Approved {new Date(withdrawal.approved_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {withdrawals.length >= 10 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/wallet/history">
                        View All History
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Withdrawal Summary */}
          {amount && parseFloat(amount) >= 30 && address && !showProcessing && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardHeader>
                <CardTitle className="text-lg text-green-900 dark:text-green-100">Withdrawal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700 dark:text-green-300">Withdrawal Amount</span>
                  <span className="font-medium text-green-900 dark:text-green-100">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700 dark:text-green-300">Processing Fee (5%)</span>
                  <span className="font-medium text-red-600">-${calculateFee(parseFloat(amount)).toFixed(2)}</span>
                </div>
                <Separator className="bg-green-200 dark:bg-green-800" />
                <div className="flex justify-between">
                  <span className="text-sm text-green-700 dark:text-green-300">You'll Receive</span>
                  <span className="font-bold text-green-900 dark:text-green-100">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Address: {address.slice(0, 8)}...{address.slice(-6)}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded p-2 mt-3">
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠️ 5% processing fee will be deducted from your withdrawal amount
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-500" />
                Processing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Instant Approval</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">15-minute processing window</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Secure verification process</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">5% processing fee applies</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-xs text-muted-foreground">
                All withdrawal requests are automatically approved and processed within 15 minutes for enhanced user experience.
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Important Notice</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Double-check your wallet address before submitting</p>
                    <p>• Minimum withdrawal amount is $30 USDT</p>
                    <p>• 5% processing fee is deducted from all withdrawals</p>
                    <p>• Withdrawals to incorrect addresses cannot be recovered</p>
                    <p>• Processing time may vary during high volume periods</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <div className="text-sm font-medium">Need Help?</div>
                <div className="text-xs text-muted-foreground">
                  Contact our support team if you have questions about withdrawals.
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
