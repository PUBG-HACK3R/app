import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function DashboardDebugPage() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Get profile if user exists
    let profile = null;
    let profileError = null;
    
    if (user) {
      const { data: profileData, error: profError } = await admin
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      profile = profileData;
      profileError = profError;
    }

    // Get all profiles for debugging
    const { data: allProfiles } = await admin
      .from("profiles")
      .select("user_id, email, role, created_at")
      .limit(10);

    // Get plans count
    const { count: plansCount } = await admin
      .from("plans")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    return (
      <div className="p-8 bg-gray-900 text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Dashboard Debug Information</h1>
        
        <div className="space-y-6">
          {/* Auth Status */}
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
            {authError ? (
              <p className="text-red-400">Auth Error: {authError.message}</p>
            ) : user ? (
              <div>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Created:</strong> {user.created_at}</p>
              </div>
            ) : (
              <p className="text-yellow-400">No authenticated user</p>
            )}
          </div>

          {/* Profile Status */}
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Profile Status</h2>
            {profileError ? (
              <p className="text-red-400">Profile Error: {profileError.message}</p>
            ) : profile ? (
              <div>
                <p><strong>Profile Role:</strong> {profile.role}</p>
                <p><strong>Profile Email:</strong> {profile.email}</p>
                <p><strong>Balance:</strong> ${profile.balance_usdt || 0}</p>
                <p><strong>Created:</strong> {profile.created_at}</p>
              </div>
            ) : (
              <p className="text-yellow-400">No profile found</p>
            )}
          </div>

          {/* System Status */}
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">System Status</h2>
            <p><strong>Active Plans:</strong> {plansCount || 0}</p>
            <p><strong>Total Profiles:</strong> {allProfiles?.length || 0}</p>
          </div>

          {/* All Profiles */}
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">All Profiles</h2>
            {allProfiles && allProfiles.length > 0 ? (
              <div className="space-y-2">
                {allProfiles.map((p) => (
                  <div key={p.user_id} className="text-sm">
                    <strong>{p.email}</strong> - {p.role} - {p.user_id}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-yellow-400">No profiles found</p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-blue-800 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
            {user && !profile && (
              <div className="mb-4">
                <p className="text-yellow-300 mb-2">Profile missing! Run this SQL:</p>
                <code className="bg-black p-2 block rounded text-sm">
                  INSERT INTO profiles (user_id, email, role) VALUES ('{user.id}', '{user.email}', 'user');
                </code>
              </div>
            )}
            
            <div className="space-x-4">
              <a href="/dashboard" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white">
                Try Dashboard
              </a>
              <a href="/login" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">
                Login Page
              </a>
              <a href="/admin-debug" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white">
                Admin Debug
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8 bg-gray-900 text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-red-400">Dashboard Debug Error</h1>
        <div className="bg-red-900/20 border border-red-700 p-4 rounded">
          <p><strong>Error:</strong> {error.message}</p>
          <p><strong>Stack:</strong> {error.stack}</p>
        </div>
        
        <div className="mt-6">
          <a href="/login" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">
            Go to Login
          </a>
        </div>
      </div>
    );
  }
}
