import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionList } from "@/components/wallet/transaction-list";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Clock,
  Eye,
  Copy,
  QrCode,
  History,
  Settings
} from "lucide-react";

export default async function ModernWalletPage() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/wallet/modern");
  }

  // Get wallet balance from user_balances table (CORRECT METHOD)
  const { data: balanceData } = await admin
    .from("user_balances")
    .select("available_balance, locked_balance, total_deposited, total_withdrawn, total_earned")
    .eq("user_id", user.id)
    .maybeSingle();

  const walletBalance = Number(balanceData?.available_balance || 0);

  // Fetch all user transactions for display
  const { data: allTx } = await supabase
    .from("transaction_logs")
    .select("type, amount_usdt, created_at, description, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Also fetch NOWPayments deposits
  const { data: deposits } = await admin
    .from("deposits")
    .select("amount_usdt, created_at, status, order_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Only include successful NOWPayments deposits
  const successStatuses = new Set(["finished", "confirmed", "completed", "succeeded"]);
  const depositTxs = (deposits || [])
    .filter((d: any) => successStatuses.has(String(d.status || '').toLowerCase()))
    .map((deposit: any) => ({
      type: 'deposit' as const,
      amount_usdt: deposit.amount_usdt,
      created_at: deposit.created_at,
      description: `NOWPayments deposit (${deposit.order_id})`,
      status: deposit.status
    }));

  // Combine transactions and deposits, then sort by date
  const allTransactions = [...(allTx || []), ...depositTxs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // Use data from user_balances table for accurate stats
  const totalEarnings = Number(balanceData?.total_earned || 0);
  const totalDeposits = Number(balanceData?.total_deposited || 0);
  const totalWithdrawals = Number(balanceData?.total_withdrawn || 0);
  const lockedBalance = Number(balanceData?.locked_balance || 0);

  // Recent transactions for display (now includes NOWPayments deposits)
  const recentTx = allTransactions.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 pt-16 pb-20">

      <div className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-3xl border border-blue-700/30 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div className="text-sm text-blue-200 mb-1">My Wallet Balance</div>
            <div className="text-3xl font-bold text-white mb-2">
              ${walletBalance.toFixed(2)}
            </div>
            <div className="text-blue-300 text-sm">USDT Available</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Link href="/wallet/deposit">
            <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-6 rounded-2xl">
              <ArrowDownRight className="w-5 h-5 mr-2" />
              Deposit
            </Button>
          </Link>
          <Link href="/wallet/withdraw">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-6 rounded-2xl">
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Withdraw
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 rounded-2xl border border-orange-700/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">${lockedBalance.toFixed(0)}</div>
            <div className="text-sm text-orange-200">Active Investments</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-2xl border border-green-700/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">${totalEarnings.toFixed(0)}</div>
            <div className="text-sm text-green-200">Total Earned</div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-2xl border border-purple-700/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">${totalWithdrawals.toFixed(0)}</div>
            <div className="text-sm text-purple-200">Total Withdrawn</div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            <Link href="/wallet/history" className="text-blue-400 text-sm font-medium">
              View All →
            </Link>
          </div>
          
          <TransactionList limit={5} showTitle={false} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/wallet/history" className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-4 hover:border-gray-600/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-white">History</div>
                  <div className="text-sm text-gray-400">View all transactions</div>
                </div>
              </div>
            </Link>
            
            <Link href="/active-plans" className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-4 hover:border-gray-600/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-white">Active Plans</div>
                  <div className="text-sm text-gray-400">Manage investments</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
