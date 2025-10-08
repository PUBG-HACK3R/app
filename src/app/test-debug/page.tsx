import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function TestDebugPage() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Not logged in</div>;
  }

  // Test 1: Check if transactions table exists and what columns it has
  let tableInfo = null;
  try {
    const { data, error } = await admin
      .from("transaction_logs")
      .select("*")
      .limit(1);
    tableInfo = { data, error: error?.message };
  } catch (e: any) {
    tableInfo = { error: e.message };
  }

  // Test 2: Try to get user transactions
  let userTxs = null;
  try {
    const { data, error } = await admin
      .from("transaction_logs")
      .select("type, amount_usdt, created_at, status, description")
      .eq("user_id", user.id)
      .limit(5);
    userTxs = { data, error: error?.message, count: data?.length || 0 };
  } catch (e: any) {
    userTxs = { error: e.message };
  }

  // Test 3: Check withdrawals table
  let withdrawalsInfo = null;
  try {
    const { data, error } = await admin
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    withdrawalsInfo = { data, error: error?.message, count: data?.length || 0 };
  } catch (e: any) {
    withdrawalsInfo = { error: e.message };
  }

  // Test 4: Check balances table
  let balanceInfo = null;
  try {
    const { data, error } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", user.id)
      .single();
    balanceInfo = { data, error: error?.message };
  } catch (e: any) {
    balanceInfo = { error: e.message };
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Debug Page</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">User Info:</h2>
          <p>ID: {user.id}</p>
          <p>Email: {user.email}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <h2 className="font-bold">Transactions Table Test:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(tableInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h2 className="font-bold">User Transactions:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(userTxs, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 p-4 rounded">
          <h2 className="font-bold">Withdrawals Table:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(withdrawalsInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-purple-50 p-4 rounded">
          <h2 className="font-bold">Balance Record:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(balanceInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
