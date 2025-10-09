import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Test 1: Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: "Not authenticated", 
        step: "user_auth",
        details: authError 
      }, { status: 401 });
    }

    // Test 2: Check admin authentication
    let adminAuthResult = null;
    try {
      await requireAdminAuth();
      adminAuthResult = "success";
    } catch (error: any) {
      adminAuthResult = error.message;
    }

    // Test 3: Check plans table structure
    let tableStructure = null;
    try {
      const { data, error } = await admin
        .from("investment_plans")
        .select("*")
        .limit(1);
      tableStructure = { 
        success: !error, 
        error: error?.message,
        sample_columns: data?.[0] ? Object.keys(data[0]) : []
      };
    } catch (error: any) {
      tableStructure = { success: false, error: error.message };
    }

    // Test 4: Try to create a test plan
    const testPlanData = {
      name: "Test Plan " + Date.now(),
      description: "Test plan for debugging",
      min_amount: 50,
      daily_roi_percentage: 2,
      duration_days: 7,
      mining_type: "ASIC Mining",
      hash_rate: "100 TH/s",
      power_consumption: "3000W",
      risk_level: "Medium",
      features: ["Test Feature 1", "Test Feature 2"],
      is_active: true
    };

    let planCreateResult = null;
    try {
      const { data: plan, error } = await admin
        .from("investment_plans")
        .insert({
          name: testPlanData.name,
          description: testPlanData.description,
          min_amount: testPlanData.min_amount,
          daily_roi_percentage: testPlanData.daily_roi_percentage,
          duration_days: testPlanData.duration_days,
          mining_type: testPlanData.mining_type,
          hash_rate: testPlanData.hash_rate,
          power_consumption: testPlanData.power_consumption,
          risk_level: testPlanData.risk_level,
          features: JSON.stringify(testPlanData.features),
          is_active: testPlanData.is_active,
        })
        .select()
        .single();

      if (error) {
        planCreateResult = { success: false, error: error.message, code: error.code };
      } else {
        planCreateResult = { success: true, plan_id: plan.id };
        
        // Clean up - delete the test plan
        await admin.from("investment_plans").delete().eq("id", plan.id);
      }
    } catch (error: any) {
      planCreateResult = { success: false, error: error.message };
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      tests: {
        user_authentication: "success",
        admin_authentication: adminAuthResult,
        plans_table_access: tableStructure,
        plan_creation_test: planCreateResult
      },
      test_data_used: testPlanData
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug test failed",
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
