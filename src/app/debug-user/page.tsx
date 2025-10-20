import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function DebugUserPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Debug User Session</CardTitle>
            <CardDescription>No user logged in</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please login first, then visit this page.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Debug User Session</h1>
        <p className="text-muted-foreground">Check your user metadata and role</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</div>
            <div><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Detected Role:</strong> <span className={role === 'admin' ? 'text-green-600 font-bold' : 'text-red-600'}>{role}</span></div>
            <div><strong>Admin Access:</strong> {role === 'admin' ? '✅ YES' : '❌ NO'}</div>
            <div><strong>Can Access Admin Panel:</strong> {role === 'admin' ? '✅ YES' : '❌ NO'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App Metadata</CardTitle>
          <CardDescription>Server-side metadata (set by admin)</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user.app_metadata, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Metadata</CardTitle>
          <CardDescription>Client-side metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user.user_metadata, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full User Object</CardTitle>
          <CardDescription>Complete user session data</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {role !== 'admin' && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <h3 className="font-semibold text-red-800 dark:text-red-200">❌ Not Admin</h3>
              <p className="text-red-700 dark:text-red-300 mt-2">
                Your role is "{role}" but needs to be "admin". 
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-sm"><strong>Option 1:</strong> Run the make-admin script:</p>
                <code className="block bg-red-100 dark:bg-red-900 p-2 rounded text-sm">
                  node make-admin.js {user.email}
                </code>
                <p className="text-sm"><strong>Option 2:</strong> Set in Supabase Dashboard manually</p>
                <p className="text-sm"><strong>Option 3:</strong> Log out and back in after setting admin role</p>
              </div>
            </div>
          )}
          
          {role === 'admin' && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200">✅ Admin Access Confirmed</h3>
              <p className="text-green-700 dark:text-green-300 mt-2">
                You have admin role! You can access the admin panel.
              </p>
              <a 
                href="/admin" 
                className="inline-block mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Go to Admin Panel
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
