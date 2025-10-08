import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, TrendingUp, PiggyBank } from "lucide-react";

type Tx = { 
  type: "deposit" | "earning" | "withdrawal" | "investment" | "pending_deposit"; 
  amount_usdt: number; 
  created_at: string;
  status?: string;
  order_id?: string;
  description?: string;
};

export default async function WalletHistoryPage() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wallet/history");

  // Get confirmed transactions using admin client (bypasses RLS) - only select existing columns
  const { data: txs, error: txError } = await admin
    .from("transaction_logs")
    .select("type, amount_usdt, created_at, status, description")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  console.log("=== TRANSACTION HISTORY DEBUG ===");
  console.log("User ID:", user.id);
  console.log("User Email:", user.email);
  console.log("Transactions found:", txs?.length || 0);
  console.log("Transaction error:", txError?.message || txError);
  console.log("Raw transactions:", txs);
  
  // Force show transactions even if there's an error
  if (txError) {
    console.error("Transaction query failed, but continuing with empty array");
  }

  // Test admin client directly - check if there are ANY transactions
  const { data: allTxs, error: allTxError } = await admin
    .from("transaction_logs")
    .select("user_id, type, amount_usdt, created_at")
    .limit(10);
  
  console.log("All transactions in DB:", {
    allTxs,
    allTxError: allTxError?.message || allTxError,
    allCount: allTxs?.length || 0
  });

  // Check if user has any balance records
  const { data: balanceRecord } = await admin
    .from("user_balances")
    .select("*")
    .eq("user_id", user.id)
    .single();
  
  console.log("User balance record:", balanceRecord);
  // Define success statuses and container for NOWPayments confirmed deposits
  const successStatuses = new Set(["finished", "confirmed", "completed", "succeeded"]);
  let successfulNowPayments: any[] = [];

  // Get pending deposits from deposit_transactions table using admin client
  let pendingDeposits = [];
  try {
    const { data } = await admin
      .from("deposits")
      .select("amount_usdt, created_at, status, tx_hash")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) pendingDeposits.push(...data);
  } catch (error) {
    console.log("deposit_transactions table not found, skipping");
  }

  // Also get NOWPayments deposits from deposits table
  try {
    const { data } = await admin
      .from("deposits")
      .select("amount_usdt, created_at, status, tx_hash, order_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    // Filter only successful NOWPayments deposits
    if (data) {
      successfulNowPayments = data.filter((d: any) => successStatuses.has(String(d.status || '').toLowerCase()));
    }
  } catch (error) {
    console.log("deposits table not found, skipping NOWPayments deposits");
  }

  // Combine and format all items - ensure we handle the data properly
  const confirmedTxs = (txs as Tx[] | null) || [];
  // Map successful NOWPayments deposits to normal deposit entries
  const extraConfirmed: Tx[] = (successfulNowPayments || []).map((deposit: any) => ({
    type: "deposit",
    amount_usdt: deposit.amount_usdt || 0,
    created_at: deposit.created_at,
    status: deposit.status,
    description: `NOWPayments deposit (${deposit.order_id || deposit.tx_hash || ''})`
  }));
  const pendingTxs = (pendingDeposits || []).map((deposit: any) => ({
    type: "pending_deposit" as const,
    amount_usdt: deposit.amount || deposit.amount_usdt || 0,
    created_at: deposit.created_at,
    status: deposit.status,
    order_id: deposit.tx_hash || deposit.order_id
  }));

  // Debug the processed data
  console.log("Processed confirmed transactions:", confirmedTxs.length);
  console.log("Extra confirmed NOWPayments deposits:", extraConfirmed.length);
  console.log("Processed pending deposits:", pendingTxs.length);

  // Combine and sort by date
  const allItems = [...confirmedTxs, ...extraConfirmed, ...pendingTxs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  const items = allItems;

  // Debug info (remove in production)
  console.log("Transactions found:", confirmedTxs.length);
  console.log("Pending deposits found:", pendingTxs.length);
  console.log("Total items:", items.length);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transaction History</h1>
        <p className="text-muted-foreground">Deposits, earnings, and withdrawals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Last {items.length} entries {pendingTxs.length > 0 && `(${pendingTxs.length} pending)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((t, idx) => {
                const isPending = t.type === "pending_deposit";
                const isPositive = t.type === 'deposit' || t.type === 'earning' || t.type === 'pending_deposit';
                const icon = t.type === 'deposit' || t.type === 'pending_deposit' ? ArrowUpRight : 
                           t.type === 'withdrawal' ? ArrowDownRight : 
                           t.type === 'investment' ? PiggyBank : TrendingUp;
                const IconComponent = icon;
                
                return (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-lg border ${
                    isPending ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' : 
                    'bg-muted/50 border-border'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        isPending ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' :
                        t.type === 'investment' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                        isPositive ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 
                        'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                      }`}>
                        {isPending ? <Clock className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">
                            {t.type === 'pending_deposit' ? 'Deposit' : 
                             t.type === 'investment' ? 'Plan Purchase' : t.type}
                          </span>
                          {t.type === 'investment' && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              Plan Purchase
                            </Badge>
                          )}
                          {isPending && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(t.created_at).toLocaleString()}
                          {isPending && t.order_id && (
                            <span className="ml-2 text-xs">ID: {t.order_id.slice(-8)}</span>
                          )}
                        </div>
                        {isPending && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Waiting for payment confirmation
                          </div>
                        )}
                        {'description' in t && t.description && (t.description.includes('rejected') || t.status === 'rejected') && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {t.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      isPending ? 'text-yellow-600 dark:text-yellow-400' :
                      t.type === 'investment' ? 'text-blue-600' :
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {t.type === 'investment' ? '-' : isPositive ? '+' : '-'}${Number(t.amount_usdt).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
