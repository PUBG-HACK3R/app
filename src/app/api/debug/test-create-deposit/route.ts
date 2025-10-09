import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test creating a deposit record manually (like NOWPayments create-invoice does)
    const testOrderId = `test-${Date.now()}`;
    const testAmount = 50;

    // First, ensure profile exists (like create-invoice does)
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({ 
        user_id: user.id, 
        email: user.email || "", 
        role: "user" 
      }, { onConflict: "user_id" });

    if (profileError) {
      return NextResponse.json({ 
        error: "Profile creation failed", 
        details: profileError 
      }, { status: 500 });
    }

    // Try to insert a test deposit (exactly like create-invoice does)
    const { data: depositData, error: insertErr } = await supabase
      .from("deposits")
      .insert({
        user_id: user.id,
        order_id: testOrderId,
        amount_usdt: testAmount,
        pay_currency: "usdttrc20",
        status: "pending",
        raw: { 
          invoice: { test: true }, 
          meta: { planId: null } 
        },
      })
      .select();

    if (insertErr) {
      return NextResponse.json({ 
        error: "Deposit insert failed", 
        details: insertErr,
        attempted_data: {
          user_id: user.id,
          order_id: testOrderId,
          amount_usdt: testAmount,
          pay_currency: "usdttrc20",
          status: "pending"
        }
      }, { status: 500 });
    }

    // Now check if we can query it back
    const { data: queryResult, error: queryError } = await admin
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .eq("order_id", testOrderId);

    // Clean up the test deposit
    await admin
      .from("deposits")
      .delete()
      .eq("order_id", testOrderId);

    return NextResponse.json({
      success: true,
      message: "Test deposit creation successful",
      test_results: {
        profile_creation: !profileError,
        deposit_insert: !insertErr,
        deposit_data: depositData,
        query_back: queryResult,
        query_error: queryError
      },
      user_info: {
        user_id: user.id,
        email: user.email
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Test failed",
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
