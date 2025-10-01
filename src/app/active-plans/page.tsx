import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  DollarSign, 
  Clock,
  PiggyBank,
  BarChart3,
  ArrowLeft,
  CheckCircle,
  Zap
} from "lucide-react";


export default async function ActivePlansPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) redirect("/login?next=/active-plans");

  // Get active subscriptions with plan details
  let { data: subscriptions, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select(`
      id,
      plan_id,
      principal_usdt,
      roi_daily_percent,
      start_date,
      end_date,
      active,
      next_earning_at,
      plans!inner (
        name,
        description,
        duration_days
      )
    `)
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  // Fallback query if description field doesn't exist
  if (subscriptionsError && subscriptionsError.message?.includes('description')) {
    console.log("Falling back to query without description field");
    const fallbackResult = await supabase
      .from("subscriptions")
      .select(`
        id,
        plan_id,
        principal_usdt,
        roi_daily_percent,
        start_date,
        end_date,
        active,
        next_earning_at,
        plans!inner (
          name,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false });
    
    // Add missing description field to maintain type compatibility
    const subscriptionsWithDescription = fallbackResult.data?.map(sub => ({
      ...sub,
      plans: Array.isArray(sub.plans) 
        ? sub.plans.map(plan => ({ ...plan, description: "Investment plan with competitive returns" }))
        : { ...sub.plans, description: "Investment plan with competitive returns" }
    }));
    
    subscriptions = subscriptionsWithDescription;
    subscriptionsError = fallbackResult.error;
  }

  // Debug logging
  if (subscriptionsError) {
    console.error("Subscriptions query error:", subscriptionsError);
  }
  console.log("Subscriptions data:", subscriptions);

  // Get earnings for each subscription
  const subscriptionsWithEarnings = await Promise.all(
    (subscriptions || []).map(async (sub) => {
      const { data: earnings } = await supabase
        .from("transactions")
        .select("amount_usdt")
        .eq("user_id", user.id)
        .eq("type", "earning")
        .eq("reference_id", sub.id);
      
      const totalEarned = earnings?.reduce((sum, earning) => sum + Number(earning.amount_usdt), 0) || 0;
      
      return {
        ...sub,
        total_earned: totalEarned,
        plan: Array.isArray(sub.plans) ? sub.plans[0] : sub.plans
      };
    })
  );

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    
    if (now <= start) return 0;
    if (now >= end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateTotalReturn = (principal: number, totalEarned: number) => {
    return principal > 0 ? ((totalEarned / principal) * 100) : 0;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Active Investment Plans</h1>
          <p className="text-muted-foreground">Monitor your active investments and track returns</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/plans">
              <PiggyBank className="h-4 w-4 mr-2" />
              Browse Plans
            </Link>
          </Button>
        </div>
      </div>

      {subscriptionsWithEarnings.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <PiggyBank className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Active Plans</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You don't have any active investment plans yet. Browse our available plans to start earning.
                </p>
              </div>
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/plans">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Explore Investment Plans
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Active Plans</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {subscriptionsWithEarnings.length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <PiggyBank className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Total Invested</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      ${subscriptionsWithEarnings.reduce((sum, sub) => sum + Number(sub.principal_usdt), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Total Earned</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      ${subscriptionsWithEarnings.reduce((sum, sub) => sum + (sub.total_earned || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Plans */}
          <div className="space-y-6">
            {subscriptionsWithEarnings.map((subscription) => {
              const progress = calculateProgress(subscription.start_date, subscription.end_date);
              const daysRemaining = calculateDaysRemaining(subscription.end_date);
              const totalReturn = calculateTotalReturn(Number(subscription.principal_usdt), subscription.total_earned || 0);
              const dailyEarning = (Number(subscription.principal_usdt) * Number(subscription.roi_daily_percent)) / 100;
              const projectedTotal = Number(subscription.principal_usdt) + (dailyEarning * (subscription.plan?.duration_days || 0));

              return (
                <Card key={subscription.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          {subscription.plan?.name}
                        </CardTitle>
                        <CardDescription>
                          {subscription.plan?.description || "Investment plan with competitive returns"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Investment Progress</span>
                        <span className="font-medium">{progress}% Complete</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Started: {new Date(subscription.start_date).toLocaleDateString()}</span>
                        <span>Ends: {new Date(subscription.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Investment Details */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-500" />
                          Investment Details
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Principal Amount</span>
                            <span className="font-medium">${Number(subscription.principal_usdt).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Daily ROI</span>
                            <span className="font-medium text-green-600">{Number(subscription.roi_daily_percent).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Daily Earning</span>
                            <span className="font-medium text-green-600">${dailyEarning.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Duration</span>
                            <span className="font-medium">{subscription.plan?.duration_days} days</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-purple-500" />
                          Performance
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Earned</span>
                            <span className="font-medium text-green-600">${(subscription.total_earned || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Return</span>
                            <span className="font-medium text-purple-600">{totalReturn.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Projected Total</span>
                            <span className="font-medium text-blue-600">${projectedTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Days Remaining</span>
                            <span className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {daysRemaining}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next Earning */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Next Earning</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            ${dailyEarning.toFixed(2)}
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">
                            {new Date(subscription.next_earning_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
