import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Fetch all user transactions to compute balance
  const { data: allTx } = await supabase
    .from("transactions")
    .select("type, amount_usdt, created_at, description, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Also fetch NOWPayments deposits (pending and completed)
  const { data: deposits } = await admin
    .from("deposits")
    .select("amount_usdt, created_at, status, order_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Convert deposits to transaction format for display
  const depositTxs = (deposits || []).map((deposit: any) => ({
    type: deposit.status === 'pending' ? 'pending_deposit' : 'deposit',
    amount_usdt: deposit.amount_usdt,
    created_at: deposit.created_at,
    description: `NOWPayments deposit (${deposit.order_id})`,
    status: deposit.status
  }));

  // Combine transactions and deposits, then sort by date
  const allTransactions = [...(allTx || []), ...depositTxs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const totalEarnings = (allTx || [])
    .filter((t) => t.type === "earning")
    .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
  const totalDeposits = (allTx || [])
    .filter((t) => t.type === "deposit")
    .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
  const totalInvestments = (allTx || [])
    .filter((t) => t.type === "investment")
    .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
  const totalReturns = (allTx || [])
    .filter((t) => t.type === "investment_return")
    .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
  const totalWithdrawals = (allTx || [])
    .filter((t) => t.type === "withdrawal")
    .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
  
  // New balance calculation: deposits + earnings + returns - investments - withdrawals
  const walletBalance = totalDeposits + totalEarnings + totalReturns - totalInvestments - totalWithdrawals;

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
            <div className="text-2xl font-bold text-white">${totalInvestments.toFixed(0)}</div>
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
          
          <div className="space-y-3">
            {recentTx.length > 0 ? (
              recentTx.map((tx, index) => (
                <div key={index} className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-green-500/20' :
                        tx.type === 'pending_deposit' ? 'bg-yellow-500/20' :
                        tx.type === 'earning' ? 'bg-blue-500/20' :
                        tx.type === 'investment' ? 'bg-red-500/20' :
                        tx.type === 'investment_return' ? 'bg-purple-500/20' :
                        'bg-orange-500/20'
                      }`}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownRight className="w-5 h-5 text-green-400" />
                        ) : tx.type === 'pending_deposit' ? (
                          <Clock className="w-5 h-5 text-yellow-400" />
                        ) : tx.type === 'earning' ? (
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                        ) : tx.type === 'investment' ? (
                          <ArrowUpRight className="w-5 h-5 text-red-400" />
                        ) : tx.type === 'investment_return' ? (
                          <ArrowDownRight className="w-5 h-5 text-purple-400" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white capitalize">
                          {tx.type === 'earning' ? 'Daily Earning' : 
                           tx.type === 'investment' ? 'Miner Purchase' :
                           tx.type === 'investment_return' ? 'Investment Return' :
                           tx.type === 'pending_deposit' ? 'Pending Deposit' :
                           tx.type === 'deposit' ? 'Deposit' :
                           tx.type}
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      (tx.type === 'withdrawal' || tx.type === 'investment') ? 'text-red-400' : 
                      tx.type === 'pending_deposit' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {(tx.type === 'withdrawal' || tx.type === 'investment') ? '-' : '+'}${Number(tx.amount_usdt).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-8 text-center">
                <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <div className="text-gray-400">No transactions yet</div>
                <div className="text-sm text-gray-500 mt-1">Start by making your first deposit</div>
              </div>
            )}
          </div>
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
