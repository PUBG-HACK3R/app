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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Crypto Ticker */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50">
          <CryptoTicker variant="dashboard" />
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Crypto Portfolio 
              <span className="block sm:inline bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Monitor your investments and track crypto earnings in real-time</p>
          </div>
          <div className="flex justify-center sm:justify-end">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200" asChild>
              <Link href="/wallet">
                <Wallet className="mr-2 h-4 w-4" />
                Wallet
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Portfolio Value Card */}
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm hover:border-blue-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-200">Portfolio Value</CardTitle>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors duration-300">
                  <Wallet className="h-4 w-4 text-blue-400" />
                </div>
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

          {/* Total Returns Card */}
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm hover:border-green-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-200">Total Returns</CardTitle>
              <div className="p-2 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors duration-300">
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">${totalEarnings.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                  +{roi.toFixed(1)}% ROI
                </Badge>
                <div className="text-xs text-green-300">All-time</div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Earnings Card */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50 backdrop-blur-sm hover:border-purple-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-200">Today's Earnings</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-2 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors duration-300">
                  <Zap className="h-4 w-4 text-purple-400" />
                </div>
                <Bitcoin className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">${todayEarnings.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {earningsChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${
                    earningsChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {earningsChange >= 0 ? '+' : ''}{earningsChangePercent.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-purple-300">vs yesterday</span>
              </div>
            </CardContent>
          </Card>

          {/* Investment Status Card */}
          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50 backdrop-blur-sm hover:border-orange-500/70 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-orange-200">Investment Status</CardTitle>
              <div className="p-2 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors duration-300">
                <Target className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSub ? (
                  <>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      Active Plan
                    </Badge>
                    <div className="text-sm text-orange-300">
                      Earning daily crypto returns
                    </div>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                      No Active Plan
                    </Badge>
                    <Button size="sm" className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/30" asChild>
                      <Link href="/plans">
                        <Target className="mr-1 h-3 w-3" />
                        View Plans
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white">Crypto Performance Analytics</CardTitle>
                  <CardDescription className="text-gray-400">Daily earnings over the last 7 days</CardDescription>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DailyReturnsChart data={data} />
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">7-Day Total</div>
                  <div className="text-lg font-bold text-white">${data.reduce((sum, d) => sum + d.earnings, 0).toFixed(2)}</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Daily Average</div>
                  <div className="text-lg font-bold text-white">${(data.reduce((sum, d) => sum + d.earnings, 0) / 7).toFixed(2)}</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Best Day</div>
                  <div className="text-lg font-bold text-green-400">${Math.max(...data.map(d => d.earnings)).toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start bg-slate-700/30 hover:bg-slate-700/50 text-gray-300 hover:text-white border-0" asChild>
                  <Link href="/active-plans">
                    <BarChart3 className="mr-3 h-4 w-4 text-blue-400" />
                    Active Plans
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-slate-700/30 hover:bg-slate-700/50 text-gray-300 hover:text-white border-0" asChild>
                  <Link href="/plans">
                    <Target className="mr-3 h-4 w-4 text-green-400" />
                    Browse Investment Plans
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-slate-700/30 hover:bg-slate-700/50 text-gray-300 hover:text-white border-0" asChild>
                  <Link href="/wallet/history">
                    <Clock className="mr-3 h-4 w-4 text-purple-400" />
                    Transaction History
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-slate-700/30 hover:bg-slate-700/50 text-gray-300 hover:text-white border-0" asChild>
                  <Link href="/wallet">
                    <Wallet className="mr-3 h-4 w-4 text-orange-400" />
                    Wallet Overview
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-slate-700/30 hover:bg-slate-700/50 text-gray-300 hover:text-white border-0" asChild>
                  <Link href="/referrals">
                    <Users className="mr-3 h-4 w-4 text-pink-400" />
                    Referral Program
                  </Link>
                </Button>
                <SupportButton 
                  className="w-full justify-start bg-slate-700/30 hover:bg-slate-700/50 text-gray-300 hover:text-white border-0"
                >
                  <Shield className="mr-3 h-4 w-4 text-cyan-400" />
                  Contact Support
                </SupportButton>
              </CardContent>
            </Card>

            {/* Investment Summary */}
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-orange-400" />
                  Investment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg">
                    <span className="text-gray-400 text-sm">Total Invested</span>
                    <span className="font-semibold text-white">${totalDeposits.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg">
                    <span className="text-gray-400 text-sm">Total Earned</span>
                    <span className="font-semibold text-green-400">${totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg">
                    <span className="text-gray-400 text-sm">Total Withdrawn</span>
                    <span className="font-semibold text-white">${totalWithdrawals.toFixed(2)}</span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-700/30">
                    <span className="text-white font-medium">Net Profit</span>
                    <span className={`font-bold text-lg ${totalEarnings - totalWithdrawals >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(totalEarnings - totalWithdrawals).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {totalInvested > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">ROI Progress</span>
                      <span className="font-semibold text-blue-400">{roi.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(roi, 100)} className="h-3 bg-slate-700" />
                    <div className="text-xs text-gray-500 text-center">
                      {roi >= 100 ? 'Target achieved! 🎉' : `${(100 - roi).toFixed(1)}% to target`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

