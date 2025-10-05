import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PendingWithdrawalsTable, type PendingWithdrawal } from "@/components/admin/pending-withdrawals-table";
import { AdminTools } from "@/components/admin/admin-tools";
import { UserManagement } from "@/components/admin/user-management";
import { AdvancedPlanManagement } from "@/components/admin/plan-management-advanced";

export default async function AdminPage() {
  try {
    // Direct auth check for more reliable admin access
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Admin page - Auth error:", authError);
      redirect("/login?next=/admin");
    }

    // Check admin role directly using admin client
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.log("Admin page - Profile error or not admin:", profileError, profile?.role);
      redirect("/dashboard");
    }

  // Load admin overview metrics using service role (bypasses RLS)
  const admin = getSupabaseAdminClient();
  
  // Get real-time data directly from tables
  const { data: deposits } = await admin
    .from("transactions")
    .select("amount_usdt")
    .eq("type", "deposit");
    
  const { data: withdrawals } = await admin
    .from("transactions")
    .select("amount_usdt")
    .eq("type", "withdrawal");
    
  const { data: earnings } = await admin
    .from("transactions")
    .select("amount_usdt")
    .eq("type", "earning");

  const { count: pendingWithdrawalsCount } = await admin
    .from("withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const totalDeposits = (deposits || []).reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
  const totalWithdrawalsAmount = (withdrawals || []).reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);
  const totalEarnings = (earnings || []).reduce((sum, t) => sum + Number(t.amount_usdt || 0), 0);

  // Fetch pending withdrawals with new fields
  const { data: pendingList } = await admin
    .from("withdrawals")
    .select("id,user_id,amount_usdt,fee_usdt,net_amount_usdt,address,status,created_at,expires_at,processing_started_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  const pending = (pendingList as PendingWithdrawal[] | null) || [];

  // Count urgent withdrawals (expiring within 5 minutes)
  const urgentThreshold = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  const { count: urgentWithdrawalsCount } = await admin
    .from("withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .not("expires_at", "is", null)
    .lt("expires_at", urgentThreshold.toISOString());

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6 bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 min-h-screen">
      <div>
        <h1 className="text-2xl font-semibold text-white">Mining Operations Admin</h1>
        <p className="text-gray-400">Bitcoin mining platform management and oversight.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Mining Deposits</CardTitle>
            <CardDescription className="text-gray-400">All time USDT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">${totalDeposits.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Mining Payouts</CardTitle>
            <CardDescription className="text-gray-400">Pending approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">{pendingWithdrawalsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card className={urgentWithdrawalsCount && urgentWithdrawalsCount > 0 ? "border-red-500 bg-red-950/20" : "bg-gray-800/50 border-gray-700/50"}>
          <CardHeader>
            <CardTitle className={urgentWithdrawalsCount && urgentWithdrawalsCount > 0 ? "text-red-300" : "text-white"}>
              Urgent Payouts
            </CardTitle>
            <CardDescription className={urgentWithdrawalsCount && urgentWithdrawalsCount > 0 ? "text-red-400" : "text-gray-400"}>
              Expiring soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${urgentWithdrawalsCount && urgentWithdrawalsCount > 0 ? "text-red-300 animate-pulse" : "text-red-400"}`}>
              {urgentWithdrawalsCount ?? 0}
            </div>
            {urgentWithdrawalsCount && urgentWithdrawalsCount > 0 && (
              <div className="text-xs text-red-400 mt-1">
                ⚠️ Action required
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Mining Rewards</CardTitle>
            <CardDescription className="text-gray-400">Total distributed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <UserManagement />

      {/* Plan Management */}
      <AdvancedPlanManagement />

      {/* Admin Tools */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">💰 Miner Balance Management</CardTitle>
          <CardDescription className="text-gray-400">Top-up miner balances for mining investments and operations</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTools />
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">⚡ Mining Payout Management</CardTitle>
          <CardDescription className="text-gray-400">
            Process and approve miner withdrawal requests with real-time urgency tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingWithdrawalsTable initial={pending} />
        </CardContent>
      </Card>
    </main>
  );
  } catch (error) {
    console.error("Admin page error:", error);
    redirect("/login?next=/admin");
  }
}

