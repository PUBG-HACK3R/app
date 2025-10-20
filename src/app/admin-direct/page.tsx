import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function AdminDirectPage() {
  try {
    // Direct auth check without helper
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Auth error or no user:", authError);
      redirect("/login?next=/admin-direct");
    }

    // Direct profile check using admin client
    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    console.log("Profile data:", profile);
    console.log("Profile error:", profileError);

    if (profileError || !profile) {
      console.log("Profile error or no profile");
      redirect("/login?next=/admin-direct");
    }

    if (profile.role !== 'admin') {
      console.log("User is not admin, role:", profile.role);
      redirect("/dashboard");
    }

    // Get basic admin stats
    const { count: totalUsers } = await admin
      .from("user_profiles")
      .select("user_id", { count: "exact", head: true });

    const { count: totalPlans } = await admin
      .from("investment_plans")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">WeEarn Mining Admin Panel</h1>
            <p className="text-gray-400">Bitcoin mining platform management and oversight.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Total Miners</CardTitle>
                <CardDescription className="text-gray-400">Registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-400">{totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Active Plans</CardTitle>
                <CardDescription className="text-gray-400">Mining plans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">{totalPlans || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Admin Status</CardTitle>
                <CardDescription className="text-gray-400">Your access level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">ADMIN</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">System Status</CardTitle>
                <CardDescription className="text-gray-400">Platform health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">ONLINE</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Admin Access Confirmed</CardTitle>
                <CardDescription className="text-gray-400">Authentication working</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-white"><strong>User ID:</strong> {user.id}</p>
                  <p className="text-white"><strong>Email:</strong> {user.email}</p>
                  <p className="text-white"><strong>Role:</strong> {profile.role}</p>
                </div>
                
                <div className="space-y-2">
                  <a href="/admin" className="block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-center">
                    Try Main Admin Panel
                  </a>
                  <a href="/dashboard" className="block bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-center">
                    Go to Dashboard
                  </a>
                  <a href="/admin-debug" className="block bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white text-center">
                    Admin Debug Page
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">Admin tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="/plans" className="block bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded text-white text-center">
                  View Mining Plans
                </a>
                <a href="/wallet" className="block bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-white text-center">
                  Wallet Operations
                </a>
                <a href="/settings" className="block bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white text-center">
                  Settings
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );

  } catch (error: any) {
    console.error("Admin direct page error:", error);
    
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Admin Access Error</h1>
          <div className="bg-red-900/20 border border-red-700 p-4 rounded mb-4">
            <p className="text-white"><strong>Error:</strong> {error.message}</p>
            <p className="text-gray-300 text-sm mt-2">{error.stack}</p>
          </div>
          
          <div className="space-x-4">
            <a href="/login" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">
              Login Again
            </a>
            <a href="/dashboard-debug" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white">
              Debug Info
            </a>
          </div>
        </div>
      </div>
    );
  }
}
