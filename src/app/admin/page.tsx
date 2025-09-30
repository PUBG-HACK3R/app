import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PendingWithdrawalsTable, type PendingWithdrawal } from "@/components/admin/pending-withdrawals-table";
import { AdminTools } from "@/components/admin/admin-tools";
import { UserManagement } from "@/components/admin/user-management";
import { PlanManagement } from "@/components/admin/plan-management";

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // Prefer app_metadata.role or user_metadata.role, fallback to 'user'
  const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";
  if (role !== "admin") redirect("/dashboard");

  // Load admin overview metrics using service role (bypasses RLS)
  const admin = getSupabaseAdminClient();
  const { data: overview } = await admin.from("admin_overview").select("*").maybeSingle();
  const { count: pendingWithdrawalsCount } = await admin
    .from("withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const totalUsers = Number((overview as any)?.total_users || 0);
  const totalDeposits = Number((overview as any)?.total_deposits || 0);
  const totalWithdrawals = Number((overview as any)?.total_withdrawals || 0);
  const totalEarnings = Number((overview as any)?.total_earnings || 0);

  // Fetch pending withdrawals
  const { data: pendingList } = await admin
    .from("withdrawals")
    .select("id,user_id,amount_usdt,address,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  const pending = (pendingList as PendingWithdrawal[] | null) || [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-muted-foreground">Overview and management tools.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>Registered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deposits</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDeposits.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Withdrawals</CardTitle>
            <CardDescription>Pending approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingWithdrawalsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profits</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <UserManagement />

      {/* Plan Management */}
      <PlanManagement />

      {/* Admin Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Tools</CardTitle>
          <CardDescription>User management and system administration</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTools />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Withdrawals</CardTitle>
          <CardDescription>Approve user withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <PendingWithdrawalsTable initial={pending} />
        </CardContent>
      </Card>
    </main>
  );
}

