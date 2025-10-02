import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupportButton } from "@/components/support-button";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  History,
  CreditCard,
  Shield,
  Clock,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Banknote,
  Activity,
  Bitcoin,
  Coins,
  Zap,
  MessageCircle,
  Users,
  Lock
} from "lucide-react";

export default async function WalletPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/wallet");
  }

  // Fetch user transactions and balance
  const { data: allTx } = await supabase
    .from("transactions")
    .select("type, amount_usdt, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get pending deposits
  const { data: pendingDeposits } = await supabase
    .from("deposits")
    .select("amount_usdt, created_at, status, order_id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(3);

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

  // Combine confirmed transactions with pending deposits for recent activity
  const confirmedTxs = (allTx || []).slice(0, 3);
  const pendingTxs = (pendingDeposits || []).map((deposit: any) => ({
    type: "pending_deposit" as const,
    amount_usdt: deposit.amount_usdt,
    created_at: deposit.created_at,
    status: deposit.status,
    order_id: deposit.order_id
  }));

  // Combine and sort recent transactions
  const recentTransactions = [...confirmedTxs, ...pendingTxs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Crypto Wallet 
                <span className="block sm:inline bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Management
                </span>
              </h1>
              {pendingTxs.length > 0 && (
                <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30 w-fit">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingTxs.length} Pending
                </Badge>
              )}
            </div>
            <p className="text-gray-400 text-sm sm:text-base">
              Manage your USDT funds, deposits, and withdrawals securely
              {pendingTxs.length > 0 && (
                <span className="block sm:inline sm:ml-2 text-yellow-400 text-sm">
                  • {pendingTxs.length} deposit{pendingTxs.length > 1 ? 's' : ''} awaiting blockchain confirmation
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200" asChild>
              <Link href="/wallet/deposit">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Deposit USDT
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white backdrop-blur-sm" asChild>
              <Link href="/wallet/withdraw">
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Withdraw
              </Link>
            </Button>
          </div>
        </div>

        {/* Pending Deposits Alert */}
        {pendingTxs.length > 0 && (
          <Card className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-amber-700/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400" />
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {pendingTxs.length} Pending Crypto Deposit{pendingTxs.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-amber-200 text-sm sm:text-base">
                    Your USDT deposit{pendingTxs.length > 1 ? 's are' : ' is'} being processed on the blockchain. 
                    You'll receive confirmation once the transaction is verified.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pendingTxs.map((deposit, idx) => (
                      <Badge key={idx} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                        <Coins className="h-3 w-3 mr-1" />
                        ${Number(deposit.amount_usdt).toFixed(2)} USDT
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Balance Overview */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Available Balance Card */}
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm hover:border-blue-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-200">Available Balance</CardTitle>
              <div className="p-2 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors duration-300">
                <Wallet className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">${walletBalance.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                  <Coins className="h-3 w-3 mr-1" />
                  USDT
                </Badge>
                <div className="flex items-center gap-1 text-xs text-blue-300">
                  <Shield className="h-3 w-3" />
                  Secured
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Deposits Card */}
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm hover:border-green-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-200">Total Deposits</CardTitle>
              <div className="p-2 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors duration-300">
                <ArrowUpRight className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">${totalDeposits.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                  Lifetime
                </Badge>
                <div className="text-xs text-green-300">All deposits</div>
              </div>
            </CardContent>
          </Card>

          {/* Total Earnings Card */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50 backdrop-blur-sm hover:border-purple-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-200">Total Earnings</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-2 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors duration-300">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                </div>
                <Bitcoin className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">${totalEarnings.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  Crypto Returns
                </Badge>
                <div className="text-xs text-purple-300">Investment gains</div>
              </div>
            </CardContent>
          </Card>

          {/* Total Withdrawn Card */}
          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50 backdrop-blur-sm hover:border-orange-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-orange-200">Total Withdrawn</CardTitle>
              <div className="p-2 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors duration-300">
                <ArrowDownRight className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">${totalWithdrawals.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                  Lifetime
                </Badge>
                <div className="text-xs text-orange-300">All withdrawals</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm hover:border-green-500/70 transition-all duration-300 group lg:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <CardTitle className="text-lg sm:text-xl text-white">Deposit USDT</CardTitle>
              <CardDescription className="text-sm sm:text-base text-green-200">
                Add crypto funds via secure TRC20 payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-green-300">
                  <Shield className="h-4 w-4" />
                  <span>NOWPayments integration</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-green-300">
                  <Clock className="h-4 w-4" />
                  <span>Instant blockchain processing</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-green-300">
                  <Coins className="h-4 w-4" />
                  <span>USDT TRC20 supported</span>
                </div>
              </div>
              <Button size="lg" className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg" asChild>
                <Link href="/wallet/deposit">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Deposit Now
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm hover:border-blue-500/70 transition-all duration-300 group lg:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <PiggyBank className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <CardTitle className="text-lg sm:text-xl text-white">Withdraw USDT</CardTitle>
              <CardDescription className="text-sm sm:text-base text-blue-200">
                Request withdrawal of your crypto balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-blue-300">
                  <Shield className="h-4 w-4" />
                  <span>Instant approval</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-blue-300">
                  <Clock className="h-4 w-4" />
                  <span>15-minute processing</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-blue-300">
                  <DollarSign className="h-4 w-4" />
                  <span>Minimum $30 withdrawal</span>
                </div>
              </div>
              <Button size="lg" variant="outline" className="w-full border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white" asChild>
                <Link href="/wallet/withdraw">
                  <ArrowDownRight className="mr-2 h-4 w-4" />
                  Request Withdrawal
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50 backdrop-blur-sm hover:border-purple-500/70 transition-all duration-300 group lg:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <CardTitle className="text-lg sm:text-xl text-white">Transaction History</CardTitle>
              <CardDescription className="text-sm sm:text-base text-purple-200">
                View all crypto transactions and earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-purple-300">
                  <History className="h-4 w-4" />
                  <span>Complete blockchain log</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-purple-300">
                  <Clock className="h-4 w-4" />
                  <span>Real-time updates</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-purple-300">
                  <Shield className="h-4 w-4" />
                  <span>Secure and transparent</span>
                </div>
              </div>
              <Button size="lg" className="w-full bg-purple-700/50 hover:bg-purple-700/70 text-purple-200 hover:text-white border border-purple-600/50" asChild>
                <Link href="/wallet/history">
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50 backdrop-blur-sm hover:border-orange-500/70 transition-all duration-300 group lg:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <CardTitle className="text-lg sm:text-xl text-white">Need Help?</CardTitle>
              <CardDescription className="text-sm sm:text-base text-orange-200">
                Get instant crypto support via live chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-orange-300">
                  <Zap className="h-4 w-4" />
                  <span>Instant response</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-orange-300">
                  <Shield className="h-4 w-4" />
                  <span>24/7 availability</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-orange-300">
                  <Users className="h-4 w-4" />
                  <span>Expert crypto team</span>
                </div>
              </div>
              <SupportButton size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
                <MessageCircle className="mr-2 h-4 w-4" />
                Start Live Chat
              </SupportButton>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {recentTransactions.length > 0 && (
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    Recent Crypto Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400">Your latest blockchain transactions</CardDescription>
                </div>
                <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white" asChild>
                  <Link href="/wallet/history">
                    <History className="mr-2 h-4 w-4" />
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((tx, index) => {
                  const isPending = tx.type === 'pending_deposit';
                  const isPositive = tx.type === 'deposit' || tx.type === 'earning' || tx.type === 'pending_deposit';
                  const icon = tx.type === 'deposit' || tx.type === 'pending_deposit' ? ArrowUpRight : 
                             tx.type === 'withdrawal' ? ArrowDownRight : TrendingUp;
                  const IconComponent = icon;
                  
                  return (
                    <div key={index} className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                      isPending ? 'bg-amber-900/30 border border-amber-700/50' : 
                      'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          isPending ? 'bg-amber-500/20 text-amber-400' :
                          isPositive ? 'bg-green-500/20 text-green-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {isPending ? <Clock className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium capitalize text-white">
                              {tx.type === 'pending_deposit' ? 'USDT Deposit' : tx.type}
                            </span>
                            {isPending && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(tx.created_at as string).toLocaleDateString()}
                            {isPending && (
                              <span className="ml-2 text-xs text-amber-400">
                                Blockchain confirmation pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        isPending ? 'text-amber-400' :
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isPositive ? '+' : '-'}${Number(tx.amount_usdt).toFixed(2)}
                        <span className="text-xs text-gray-500 ml-1">USDT</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Crypto Wallet Security Info */}
        <Card className="bg-gradient-to-r from-slate-800/80 to-blue-900/20 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <Shield className="h-8 w-8 text-blue-400" />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-lg font-semibold text-white">Your Crypto Wallet is Fortress-Protected</h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  All USDT transactions are secured with military-grade encryption and multi-layer blockchain security protocols. 
                  Your crypto funds are stored in secure cold storage wallets with 24/7 monitoring and multi-signature protection.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    <Shield className="h-3 w-3 mr-1" />
                    256-bit Encryption
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <Lock className="h-3 w-3 mr-1" />
                    Cold Storage
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    24/7 Monitoring
                  </Badge>
                  <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                    <Bitcoin className="h-3 w-3 mr-1" />
                    Multi-Sig Protection
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
