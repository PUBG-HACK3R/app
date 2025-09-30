import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if user is admin
    const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role || "user";
    if (role !== "admin") return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });

    const admin = getSupabaseAdminClient();

    // Test 1: Check transactions table structure
    const { data: tableInfo, error: tableError } = await admin
      .from("transactions")
      .select("*")
      .limit(1);

    // Test 2: Try to insert a test transaction (we'll delete it immediately)
    const testUserId = user.id; // Use current admin user for test
    const { data: testTx, error: insertError } = await admin
      .from("transactions")
      .insert({
        user_id: testUserId,
        type: "deposit",
        amount_usdt: 0.01,
        reference_id: null, // Test transaction doesn't need external reference
        meta: { test: true, description: "Test transaction - will be deleted", reference: `test-${Date.now()}` },
      })
      .select();

    let deleteError = null;
    if (testTx && testTx.length > 0) {
      // Delete the test transaction immediately
      const { error: delError } = await admin
        .from("transactions")
        .delete()
        .eq("id", testTx[0].id);
      deleteError = delError;
    }

    // Test 3: Check profiles table
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      tests: {
        tableStructure: {
          success: !tableError,
          error: tableError?.message,
          sampleData: tableInfo?.[0] || null,
        },
        transactionInsert: {
          success: !insertError,
          error: insertError?.message,
          code: insertError?.code,
          testData: testTx?.[0] || null,
        },
        transactionDelete: {
          success: !deleteError,
          error: deleteError?.message,
        },
        profileCheck: {
          success: !profileError,
          error: profileError?.message,
          profileExists: !!profileData,
        },
      },
      adminUser: {
        id: user.id,
        email: user.email,
        role: role,
      },
    });
  } catch (err: any) {
    console.error("Database test error:", err);
    return NextResponse.json({ 
      error: "Test failed", 
      details: err.message,
      stack: err.stack 
    }, { status: 500 });
  }
}
