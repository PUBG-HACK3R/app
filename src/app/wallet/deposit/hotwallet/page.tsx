"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Smartphone
} from "lucide-react";
import { Suspense } from "react";
import HotWalletConnector from "@/components/wallet/hot-wallet-connector";

function HotWalletDepositContent() {
  const search = useSearchParams();
  const [amount, setAmount] = React.useState<string>("");
  const [hotWalletSuccess, setHotWalletSuccess] = React.useState<string | null>(null);
  const [hotWalletError, setHotWalletError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const qAmount = search.get("amount");
    if (qAmount) setAmount(qAmount);
  }, [search]);

  const handleHotWalletSuccess = async (txHash: string, walletAddress: string) => {
    try {
      const response = await fetch("/api/hotwallet-deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash,
          amount: parseFloat(amount),
          wallet: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process deposit");
      }

      setHotWalletSuccess(`Deposit successful! Transaction: ${txHash.slice(0, 10)}...`);
      setHotWalletError(null);
      setAmount("");
    } catch (err: any) {
      console.error("Hot wallet deposit error:", err);
      setHotWalletError(err.message);
    }
  };

  const handleHotWalletError = (error: string) => {
    setHotWalletError(error);
    setHotWalletSuccess(null);
  };

  const planName = search.get("plan");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
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
              Hot Wallet 
              <span className="block sm:inline bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Deposit
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              {planName ? `Connect your wallet to deposit for your ${planName} investment plan` : 'Connect your MetaMask or TrustWallet to deposit USDT directly'}
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 px-4 py-2 rounded-full">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Instant Transfer</span>
          </div>
        </div>

        {/* Amount Display */}
        {amount && (
          <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-sm text-purple-300 mb-2">Deposit Amount</div>
                <div className="text-3xl font-bold text-white">${amount} USDT</div>
                {planName && (
                  <div className="text-sm text-purple-300 mt-2">for {planName} Plan</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Hot Wallet Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Requirements */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                    <Smartphone className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Wallet Requirements</CardTitle>
                    <CardDescription className="text-gray-400">Make sure you have one of these wallets installed</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3 p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">MetaMask</div>
                      <div className="text-sm text-gray-400">Browser extension or mobile app</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">TrustWallet</div>
                      <div className="text-sm text-gray-400">Mobile wallet app</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-300">
                      <div className="font-medium mb-1">Important:</div>
                      <div>Make sure your wallet is connected to the Polygon network and has sufficient USDT balance for the deposit.</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hot Wallet Connector */}
            {amount && parseFloat(amount) > 0 && (
              <HotWalletConnector
                amount={parseFloat(amount)}
                onSuccess={handleHotWalletSuccess}
                onError={handleHotWalletError}
              />
            )}

            {/* Success/Error Messages */}
            {hotWalletSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-sm text-green-300">{hotWalletSuccess}</p>
              </div>
            )}

            {hotWalletError && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-300">{hotWalletError}</p>
              </div>
            )}

            {/* How It Works */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-white">How Hot Wallet Deposit Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                    <div>
                      <div className="font-medium text-white">Connect Your Wallet</div>
                      <div className="text-sm text-gray-400">Click "Connect Wallet" and approve the connection in your wallet app</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                    <div>
                      <div className="font-medium text-white">Confirm Network</div>
                      <div className="text-sm text-gray-400">Ensure you're on the Polygon network (will auto-switch if needed)</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                    <div>
                      <div className="font-medium text-white">Send USDT</div>
                      <div className="text-sm text-gray-400">Approve and send the USDT transaction to our hot wallet</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">4</div>
                    <div>
                      <div className="font-medium text-white">Instant Credit</div>
                      <div className="text-sm text-gray-400">Your balance is updated immediately after blockchain confirmation</div>
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
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Investment Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-300">Plan</span>
                    <span className="font-medium text-white capitalize">{planName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-300">Investment</span>
                    <span className="font-medium text-green-400">${parseFloat(amount).toFixed(2)} USDT</span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex items-center space-x-2 p-2 bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-300">Start earning immediately after deposit</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hot Wallet Benefits */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-white">
                  <Zap className="mr-2 h-5 w-5 text-purple-400" />
                  Hot Wallet Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">Instant confirmation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Direct blockchain transfer</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Lower network fees</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Full wallet control</span>
                  </div>
                </div>
                
                <Separator className="bg-slate-700" />
                
                <div className="text-xs text-gray-400">
                  Hot wallet deposits are processed directly on the blockchain, giving you full control 
                  over your transaction and instant confirmation.
                </div>
              </CardContent>
            </Card>

            {/* Network Information */}
            <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-blue-200">Network Information</div>
                  <div className="space-y-2 text-xs text-blue-300">
                    <div className="flex justify-between">
                      <span>Network:</span>
                      <span className="font-medium">Polygon (MATIC)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Token:</span>
                      <span className="font-medium">USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas Fees:</span>
                      <span className="font-medium text-green-400">Very Low</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confirmation:</span>
                      <span className="font-medium text-green-400">Instant</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className="text-sm font-medium text-white">Need Help?</div>
                  <div className="text-xs text-orange-200">
                    Having trouble connecting your wallet? Our support team can help.
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

export default function HotWalletDepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HotWalletDepositContent />
    </Suspense>
  );
}
