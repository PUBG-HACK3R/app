import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, TrendingUp, PiggyBank } from "lucide-react";

type Tx = { 
  type: "deposit" | "earning" | "withdrawal" | "investment" | "pending_deposit"; 
  amount_usdt: number; 
  created_at: string;
  status?: string;
  order_id?: string;
  meta?: any;
};

export default async function WalletHistoryPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wallet/history");

  // Get confirmed transactions
  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount_usdt, created_at, meta")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  // Get pending deposits
  const { data: pendingDeposits } = await supabase
    .from("deposits")
    .select("amount_usdt, created_at, status, order_id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  // Combine and format all items
  const confirmedTxs = (txs as Tx[] | null) || [];
  const pendingTxs = (pendingDeposits || []).map((deposit: any) => ({
    type: "pending_deposit" as const,
    amount_usdt: deposit.amount_usdt,
    created_at: deposit.created_at,
    status: deposit.status,
    order_id: deposit.order_id
  }));

  // Combine and sort by date
  const allItems = [...confirmedTxs, ...pendingTxs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  const items = allItems;

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
                          {t.type === 'investment' && t.meta?.plan_name && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              {t.meta.plan_name}
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
