import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ActivePlansPage() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) redirect("/login?next=/active-plans");

  // Get active subscriptions with plan details using admin client to bypass RLS
  let { data: subscriptions, error: subscriptionsError } = await admin
    .from("user_investments")
    .select(`
      id,
      plan_id,
      amount_invested,
      daily_roi_percentage,
      duration_days,
      total_earned,
      start_date,
      end_date,
      status,
      investment_plans (
        name,
        min_amount,
        daily_roi_percentage,
        duration_days
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Debug logging - check what data we actually got
  console.log("Active Plans Debug:", {
    subscriptionsCount: subscriptions?.length || 0,
    subscriptions: subscriptions?.map(sub => ({
      id: sub.id,
      plan_name: (sub as any).investment_plans?.name,
      total_earned: sub.total_earned,
      amount_invested: sub.amount_invested,
      daily_roi: sub.daily_roi_percentage
    }))
  });
  if (subscriptionsError) {
    console.error("Subscriptions query error:", subscriptionsError);
  }
  console.log("Subscriptions data:", subscriptions);

  // Use the total_earned from database directly (no need to recalculate)
  const subscriptionsWithEarnings = (subscriptions || []).map((sub) => {
    return {
      ...sub,
      plan: (sub as any).investment_plans
    };
  });

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 pt-16 pb-20">
      <div className="px-4 py-6 space-y-6">

        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">My Investments</h1>
          <p className="text-gray-400">Track your active investment plans</p>
        </div>

        {subscriptionsWithEarnings.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-gray-700/30 p-8 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Active Plans</h3>
            <p className="text-gray-400 mb-6">
              You don't have any investments yet. Start investing to earn daily returns!
            </p>
            <Link href="/plans">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-2xl">
                <TrendingUp className="h-4 w-4 mr-2" />
                Start Investing
              </Button>
            </Link>
          </div>
        ) : (
          <div>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-2xl border border-blue-700/30 p-4 text-center">
              <div className="text-2xl font-bold text-white">{subscriptionsWithEarnings.length}</div>
              <div className="text-sm text-blue-200">Active Plans</div>
            </div>
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-2xl border border-green-700/30 p-4 text-center">
              <div className="text-2xl font-bold text-white">
                ${subscriptionsWithEarnings.reduce((sum, sub) => sum + Number(sub.amount_invested), 0).toFixed(0)}
              </div>
              <div className="text-sm text-green-200">Invested</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-2xl border border-purple-700/30 p-4 text-center">
              <div className="text-2xl font-bold text-white">
                ${subscriptionsWithEarnings.reduce((sum, sub) => sum + (sub.total_earned || 0), 0).toFixed(0)}
              </div>
              <div className="text-sm text-purple-200">Earned</div>
            </div>
          </div>

          {/* Active Plans - Simplified */}
          <div className="space-y-4">
            {subscriptionsWithEarnings.map((subscription) => {
              const progress = calculateProgress(subscription.start_date, subscription.end_date);
              const daysRemaining = calculateDaysRemaining(subscription.end_date);
              const dailyEarning = (Number(subscription.amount_invested) * Number(subscription.daily_roi_percentage)) / 100;

              return (
                <div key={subscription.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-gray-700/30 p-6">
                  {/* Plan Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        {subscription.plan?.name}
                      </h3>
                      <p className="text-gray-400 text-sm">Active Investment</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        ${(subscription.total_earned || 0).toFixed(2)}
                      </div>
                      <div className="text-gray-400 text-sm">Earned</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{width: `${progress}%`}}></div>
                    </div>
                  </div>

                  {/* Key Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Invested</div>
                      <div className="text-lg font-semibold text-white">${Number(subscription.amount_invested).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Daily Earning</div>
                      <div className="text-lg font-semibold text-green-400">${dailyEarning.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Days Left</div>
                      <div className="text-lg font-semibold text-white">{daysRemaining}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Daily Rate</div>
                      <div className="text-lg font-semibold text-blue-400">{Number(subscription.daily_roi_percentage || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
