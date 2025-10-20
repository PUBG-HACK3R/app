import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionList } from "@/components/wallet/transaction-list";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/wallet/history");
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transaction History</h1>
        <p className="text-muted-foreground">Deposits, earnings, and withdrawals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Complete transaction history including withdrawals, deposits, earnings, and investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionList limit={50} showTitle={false} />
        </CardContent>
      </Card>
    </main>
  );
}
