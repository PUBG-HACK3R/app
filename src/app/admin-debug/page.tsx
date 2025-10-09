import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDebugPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return <div className="p-8">No user found</div>;
  }

  // Check role from profiles table using admin client to bypass RLS
  const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = getSupabaseAdminClient();
  
  const { data: profile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const metadataRole = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role;

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Admin Access Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">User Info</h2>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Created:</strong> {user.created_at}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Profile Data</h2>
          {profileError ? (
            <p className="text-red-400">Error: {profileError.message}</p>
          ) : profile ? (
            <div>
              <p><strong>Profile Role:</strong> {profile.role || 'null'}</p>
              <p><strong>Profile Email:</strong> {profile.email || 'null'}</p>
              <p><strong>Profile Created:</strong> {profile.created_at || 'null'}</p>
            </div>
          ) : (
            <p className="text-yellow-400">No profile found</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Metadata</h2>
          <p><strong>App Metadata Role:</strong> {(user.app_metadata as any)?.role || 'null'}</p>
          <p><strong>User Metadata Role:</strong> {(user.user_metadata as any)?.role || 'null'}</p>
          <p><strong>Combined Role:</strong> {metadataRole || 'null'}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Final Role Check</h2>
          <p><strong>Final Role:</strong> {profile?.role || metadataRole || 'user'}</p>
          <p><strong>Is Admin:</strong> {(profile?.role || metadataRole || 'user') === 'admin' ? 'YES' : 'NO'}</p>
        </div>

        <div className="bg-blue-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <p className="mb-4">If you're not admin, run this SQL in Supabase:</p>
          <code className="bg-black p-2 block rounded text-sm">
            UPDATE profiles SET role = 'admin' WHERE user_id = '{user.id}';
          </code>
          <p className="mt-4">Or create profile if missing:</p>
          <code className="bg-black p-2 block rounded text-sm">
            INSERT INTO profiles (user_id, email, role) VALUES ('{user.id}', '{user.email}', 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
          </code>
        </div>

        <div className="mt-6">
          <a href="/admin" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">
            Try Admin Page Again
          </a>
        </div>
      </div>
    </div>
  );
}
