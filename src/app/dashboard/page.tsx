import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HorizontalPlans } from "@/components/auto-scroll-plans";
import { BalanceSection } from "@/components/dashboard/balance-section";
import { DashboardEarningsProvider } from "@/components/dashboard/dashboard-earnings-provider";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Target,
  Users,
  Gift,
  Eye
} from "lucide-react";

export default async function DashboardPage() {
  try {
    // Use standardized auth helper
    const authUser = await requireAuth();
    const admin = getSupabaseAdminClient();

    // Get wallet balance from user_balances table
    const { data: balanceData } = await admin
      .from("user_balances")
      .select("available_balance")
      .eq("user_id", authUser.id)
      .maybeSingle();

    const walletBalance = Number(balanceData?.available_balance || 0);

    // Fetch earnings transactions for stats display
    const { data: allTx } = await admin
      .from("transaction_logs")
      .select("type, amount_usdt, created_at")
      .eq("user_id", authUser.id);

    interface Transaction {
      type: string;
      amount_usdt: number;
    }

    const totalEarnings = (allTx || [])
      .filter((t: Transaction) => t.type === "earning")
      .reduce((acc: number, t: Transaction) => acc + Number(t.amount_usdt || 0), 0) || 0;

    // Fetch investment plans
    const { data: plans } = await admin
      .from("investment_plans")
      .select("*")
      .eq("is_active", true)
      .order("duration_days", { ascending: true });

    // Get all active investments for this user
    const { data: userInvestments, error: investError } = await admin
      .from("user_investments")
      .select("plan_id, status")
      .eq("user_id", authUser.id)
      .eq("status", "active");

    // Get the active investment for checking if user has any active plan
    const { data: activeInvestment, error: activeInvestError } = await admin
      .from("user_investments")
      .select("id, plan_id, end_date, status")
      .eq("user_id", authUser.id)
      .eq("status", "active")
      .maybeSingle();

    // Create a set of plan IDs that user has investments for
    const userPlanIds = new Set(userInvestments?.map((inv: any) => inv.plan_id) || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-orange-50 to-gray-100 dark:from-gray-900 dark:via-orange-900/10 dark:to-gray-900 text-gray-900 dark:text-white">
      {/* Background Earnings Provider - handles automatic earnings checking */}
      <DashboardEarningsProvider />
      
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Balance Section */}
        <BalanceSection walletBalance={walletBalance} />

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-4">
          <Link href="/wallet/deposit" className="flex flex-col items-center gap-2 p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 hover:border-gray-400/50 dark:hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-700 dark:text-white text-sm font-medium">Deposit</span>
          </Link>

          <Link href="/wallet/withdraw" className="flex flex-col items-center gap-2 p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 hover:border-gray-400/50 dark:hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-700 dark:text-white text-sm font-medium">Withdraw</span>
          </Link>

          <Link href="/referrals" className="flex flex-col items-center gap-2 p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 hover:border-gray-400/50 dark:hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-700 dark:text-white text-sm font-medium">Invite</span>
          </Link>

          <Link href="/wallet/history" className="flex flex-col items-center gap-2 p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 hover:border-gray-400/50 dark:hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-700 dark:text-white text-sm font-medium">History</span>
          </Link>
        </div>

        {/* Mining Plans - Horizontal Scroll */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mining Plans</h2>
          </div>
          
          {plans && plans.length > 0 ? (
            <HorizontalPlans 
              plans={plans.map(plan => ({
                ...plan,
                user_has_subscription: userPlanIds.has(plan.id)
              }))} 
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No plans available
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-2xl border border-green-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-green-200">Mining Earned</div>
                <div className="text-xl font-bold text-white">${totalEarnings.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-2xl border border-blue-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-blue-200">Active Miners</div>
                <div className="text-xl font-bold text-white">{activeInvestment ? '1' : '0'}</div>
                {/* Debug info - remove after testing */}
                <div className="text-xs text-gray-400">
                  Debug: {activeInvestment ? `Active (ID: ${activeInvestment.id.slice(0,8)})` : 'No active investment'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold">Mining Referrals</div>
                <div className="text-orange-100 text-sm">Earn 5% commission</div>
              </div>
            </div>
            <Link href="/referrals">
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error("Dashboard error:", error);
    redirect("/login?next=/dashboard");
  }
}

