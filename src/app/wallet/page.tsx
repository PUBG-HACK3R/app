import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Activity
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
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">Wallet Management</h1>
            {pendingTxs.length > 0 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700">
                {pendingTxs.length} Pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage your funds, deposits, and withdrawals
            {pendingTxs.length > 0 && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                • {pendingTxs.length} deposit{pendingTxs.length > 1 ? 's' : ''} awaiting confirmation
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
            <Link href="/wallet/deposit">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Deposit
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/wallet/withdraw">
              <ArrowDownRight className="mr-2 h-4 w-4" />
              Withdraw
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Deposits Alert */}
      {pendingTxs.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Clock className="h-8 w-8 text-yellow-500 mt-1" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  {pendingTxs.length} Pending Deposit{pendingTxs.length > 1 ? 's' : ''}
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Your deposit{pendingTxs.length > 1 ? 's are' : ' is'} being processed. You'll receive a confirmation once the payment is verified on the blockchain.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {pendingTxs.map((deposit, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">${walletBalance.toFixed(2)}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              USDT Balance
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Deposits</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">${totalDeposits.toFixed(2)}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Lifetime deposits
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Investment returns
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Withdrawn</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">${totalWithdrawals.toFixed(2)}</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Lifetime withdrawals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white mx-auto mb-4">
              <CreditCard className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Deposit Funds</CardTitle>
            <CardDescription className="text-base">
              Add USDT to your wallet via secure TRC20 payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure NOWPayments integration</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Instant processing</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Banknote className="h-4 w-4" />
                <span>USDT TRC20 supported</span>
              </div>
            </div>
            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" asChild>
              <Link href="/wallet/deposit">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Deposit Now
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto mb-4">
              <PiggyBank className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Withdraw Funds</CardTitle>
            <CardDescription className="text-base">
              Request withdrawal of your available balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Manual admin approval</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>24-48 hour processing</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Minimum $10 withdrawal</span>
              </div>
            </div>
            <Button size="lg" variant="outline" className="w-full" asChild>
              <Link href="/wallet/withdraw">
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Request Withdrawal
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white mx-auto mb-4">
              <Activity className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Transaction History</CardTitle>
            <CardDescription className="text-base">
              View all your deposits, withdrawals, and earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>Complete transaction log</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Real-time updates</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure and transparent</span>
              </div>
            </div>
            <Button size="lg" variant="ghost" className="w-full" asChild>
              <Link href="/wallet/history">
                <History className="mr-2 h-4 w-4" />
                View History
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentTransactions.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Activity</CardTitle>
                <CardDescription>Your latest transactions</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/wallet/history">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx, index) => {
                const isPending = tx.type === 'pending_deposit';
                const isPositive = tx.type === 'deposit' || tx.type === 'earning' || tx.type === 'pending_deposit';
                const icon = tx.type === 'deposit' || tx.type === 'pending_deposit' ? ArrowUpRight : 
                           tx.type === 'withdrawal' ? ArrowDownRight : TrendingUp;
                const IconComponent = icon;
                
                return (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                    isPending ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800' : 
                    'bg-muted/50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        isPending ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' :
                        isPositive ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 
                        'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                      }`}>
                        {isPending ? <Clock className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">
                            {tx.type === 'pending_deposit' ? 'Deposit' : tx.type}
                          </span>
                          {isPending && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(tx.created_at as string).toLocaleDateString()}
                          {isPending && (
                            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                              Awaiting payment
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      isPending ? 'text-yellow-600 dark:text-yellow-400' :
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? '+' : '-'}${Number(tx.amount_usdt).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Security Info */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Shield className="h-8 w-8 text-blue-500 mt-1" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Your Wallet is Secure</h3>
              <p className="text-muted-foreground">
                All transactions are protected with bank-level encryption and multi-layer security protocols. 
                Your funds are stored in secure cold storage wallets with 24/7 monitoring.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">256-bit Encryption</Badge>
                <Badge variant="secondary">Cold Storage</Badge>
                <Badge variant="secondary">24/7 Monitoring</Badge>
                <Badge variant="secondary">Multi-Sig Protection</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
