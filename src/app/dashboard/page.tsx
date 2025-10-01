import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SupportButton } from "@/components/support-button";
import { CryptoTicker } from "@/components/crypto-ticker";
import { DailyReturnsChart, type DailyReturnsDatum } from "@/components/charts/daily-returns";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  BarChart3,
  Target,
  Calendar,
  Clock,
  Bitcoin,
  Coins,
  Shield,
  Zap,
  Users
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Fetch all user transactions to compute balance and earnings
  const { data: allTx } = await supabase
    .from("transactions")
    .select("type, amount_usdt, created_at")
    .eq("user_id", user.id);

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

  // Active subscription status
  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, end_date, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  // Build last 7 days earnings chart
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6);
  since.setUTCHours(0, 0, 0, 0);
  const { data: earningsTx } = await supabase
    .from("transactions")
    .select("amount_usdt, created_at")
    .eq("user_id", user.id)
    .eq("type", "earning")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  // Prepare map of day label -> sum
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    return d;
  });
  const sumsByDay = new Map<string, number>();
  for (const d of dayLabels) {
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    sumsByDay.set(label, 0);
  }
  for (const tx of earningsTx || []) {
    const d = new Date(tx.created_at as string);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    sumsByDay.set(label, (sumsByDay.get(label) || 0) + Number(tx.amount_usdt || 0));
  }
  const data: DailyReturnsDatum[] = dayLabels.map((d) => ({
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    earnings: Number((sumsByDay.get(d.toLocaleDateString("en-US", { weekday: "short" })) || 0).toFixed(2)),
  }));

  // Calculate performance metrics
  const todayEarnings = data[data.length - 1]?.earnings || 0;
  const yesterdayEarnings = data[data.length - 2]?.earnings || 0;
  const earningsChange = todayEarnings - yesterdayEarnings;
  const earningsChangePercent = yesterdayEarnings > 0 ? (earningsChange / yesterdayEarnings) * 100 : 0;
  
  // Calculate ROI if there's an active subscription
  const totalInvested = totalDeposits;
  const roi = totalInvested > 0 ? (totalEarnings / totalInvested) * 100 : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Crypto Ticker */}
      <CryptoTicker variant="dashboard" />

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">Monitor your investments and track performance</p>
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

      {/* Key Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Portfolio Value</CardTitle>
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">USDT</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">${walletBalance.toFixed(2)}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secured Balance
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Returns</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">${totalEarnings.toFixed(2)}</div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="success" className="text-xs">
                +{roi.toFixed(1)}% ROI
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Today's Earnings</CardTitle>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <Bitcoin className="h-3 w-3 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">${todayEarnings.toFixed(2)}</div>
            <div className="flex items-center space-x-1 mt-1">
              {earningsChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${
                earningsChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {earningsChange >= 0 ? '+' : ''}{earningsChangePercent.toFixed(1)}%
              </span>
              <span className="text-xs text-purple-600 dark:text-purple-400">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Investment Status</CardTitle>
            <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSub ? (
                <>
                  <Badge variant="success">Active Plan</Badge>
                  <div className="text-sm text-orange-600 dark:text-orange-400">
                    Earning daily returns
                  </div>
                </>
              ) : (
                <>
                  <Badge variant="outline">No Active Plan</Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/plans">View Plans</Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Performance Analytics</CardTitle>
                <CardDescription>Daily earnings over the last 7 days</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <DailyReturnsChart data={data} />
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">7-Day Total</div>
                <div className="text-lg font-semibold">${data.reduce((sum, d) => sum + d.earnings, 0).toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Daily Average</div>
                <div className="text-lg font-semibold">${(data.reduce((sum, d) => sum + d.earnings, 0) / 7).toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Best Day</div>
                <div className="text-lg font-semibold">${Math.max(...data.map(d => d.earnings)).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href="/active-plans">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Active Plans
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href="/plans">
                  <Target className="mr-2 h-4 w-4" />
                  Browse Investment Plans
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href="/wallet/history">
                  <Clock className="mr-2 h-4 w-4" />
                  Transaction History
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href="/wallet">
                  <PiggyBank className="mr-2 h-4 w-4" />
                  Wallet Overview
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href="/referrals">
                  <Users className="mr-2 h-4 w-4" />
                  Referral Program
                </Link>
              </Button>
              <SupportButton 
                className="w-full justify-start" 
                variant="ghost"
              >
                Contact Support
              </SupportButton>
            </CardContent>
          </Card>

          {/* Investment Summary */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Investment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Invested</span>
                  <span className="font-medium">${totalDeposits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Earned</span>
                  <span className="font-medium text-green-600">${totalEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Withdrawn</span>
                  <span className="font-medium">${totalWithdrawals.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Net Profit</span>
                  <span className={totalEarnings - totalWithdrawals >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${(totalEarnings - totalWithdrawals).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {totalInvested > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ROI Progress</span>
                    <span className="font-medium">{roi.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(roi, 100)} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

