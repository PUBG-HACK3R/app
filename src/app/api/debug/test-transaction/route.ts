import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "Test transaction API is working",
      user_id: user.id
    });

  } catch (error: any) {
    console.error("Test transaction GET error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // Create a test transaction
    const { data: transaction, error: txError } = await admin
      .from("transaction_logs")
      .insert({
        user_id: user.id,
        type: "earning",
        amount_usdt: 5.00,
        description: "Test welcome bonus transaction",
        balance_before: 0,
        balance_after: 5.00,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (txError) {
      console.error("Failed to create test transaction:", txError);
      return NextResponse.json({ 
        error: "Failed to create test transaction", 
        details: txError.message 
      }, { status: 500 });
    }

    console.log("✅ Successfully created test transaction:", transaction);

    return NextResponse.json({
      success: true,
      transaction: transaction,
      message: "Test transaction created successfully",
      user_id: user.id
    });

  } catch (error: any) {
    console.error("Test transaction error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
