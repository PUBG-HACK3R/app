import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check the actual structure and data in deposits table
    let depositsTableInfo = null;
    let depositsTableError = null;
    
    try {
      // Get all deposits to see the structure
      const { data, error } = await admin
        .from("deposits")
        .select("*")
        .limit(5);
      
      depositsTableInfo = data;
      depositsTableError = error;
    } catch (error: any) {
      depositsTableError = error;
    }

    // Check specifically for user deposits
    let userDeposits = null;
    try {
      const { data } = await admin
        .from("deposits")
        .select("*")
        .eq("user_id", user.id);
      userDeposits = data;
    } catch (error) {
      // Ignore
    }

    // Try to get table schema information
    let tableSchema = null;
    try {
      const { data } = await admin
        .rpc('get_table_columns', { table_name: 'deposits' });
      tableSchema = data;
    } catch (error) {
      // RPC might not exist, try alternative
      try {
        const { data } = await admin
          .from("information_schema.columns")
          .select("column_name, data_type, is_nullable")
          .eq("table_name", "deposits")
          .eq("table_schema", "public");
        tableSchema = data;
      } catch (schemaError) {
        // Schema query failed
      }
    }

    // Check what the history page query would return
    let historyPageQuery = null;
    try {
      const { data } = await admin
        .from("deposits")
        .select("amount_usdt, created_at, status, tx_hash, order_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      historyPageQuery = data;
    } catch (error: any) {
      historyPageQuery = { error: error.message };
    }

    return NextResponse.json({
      user_id: user.id,
      current_time: new Date().toISOString(),
      deposits_table: {
        exists: !depositsTableError || depositsTableError.code !== "42P01",
        sample_data: depositsTableInfo,
        error: depositsTableError?.message,
        total_count: depositsTableInfo?.length || 0
      },
      user_specific_deposits: {
        data: userDeposits,
        count: userDeposits?.length || 0
      },
      table_schema: {
        columns: tableSchema,
        schema_available: !!tableSchema
      },
      history_page_query_result: {
        data: historyPageQuery,
        count: Array.isArray(historyPageQuery) ? historyPageQuery.length : 0
      },
      analysis: {
        table_exists: !!depositsTableInfo || !!userDeposits,
        has_user_deposits: (userDeposits?.length || 0) > 0,
        has_any_deposits: (depositsTableInfo?.length || 0) > 0,
        query_works: Array.isArray(historyPageQuery)
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug failed",
      message: error.message
    }, { status: 500 });
  }
}
