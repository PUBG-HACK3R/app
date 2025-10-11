import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    console.log('🔧 FIXING INVESTMENT PLANS DATABASE...');

    // Define correct plan structures
    const correctPlans = [
      {
        name: "Daily Plan",
        duration_days: 3,
        daily_roi_percentage: 2.6, // 2.6% daily = 7.8% total
        min_amount: 10,
        max_amount: 1000,
        payout_type: 'daily'
      },
      {
        name: "Weekly Plan", 
        duration_days: 7,
        daily_roi_percentage: 2.3, // 2.3% daily = 16.1% total
        min_amount: 50,
        max_amount: 5000,
        payout_type: 'daily'
      },
      {
        name: "Monthly Plan",
        duration_days: 30,
        daily_roi_percentage: 4.0, // 4.0% daily = 120% total (END PAYOUT)
        min_amount: 100,
        max_amount: 10000,
        payout_type: 'end'
      },
      {
        name: "Bi-Monthly Plan",
        duration_days: 60,
        daily_roi_percentage: 2.5, // 2.5% daily = 150% total (END PAYOUT)
        min_amount: 500,
        max_amount: 50000,
        payout_type: 'end'
      }
    ];

    // Get existing plans
    const { data: existingPlans, error: fetchError } = await admin
      .from("investment_plans")
      .select("*");

    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch existing plans", 
        details: fetchError.message 
      }, { status: 500 });
    }

    let updatedPlans = [];
    let createdPlans = [];

    for (const correctPlan of correctPlans) {
      // Find existing plan by name
      const existingPlan = existingPlans?.find(p => p.name === correctPlan.name);
      
      if (existingPlan) {
        // Update existing plan
        const { error: updateError } = await admin
          .from("investment_plans")
          .update({
            duration_days: correctPlan.duration_days,
            daily_roi_percentage: correctPlan.daily_roi_percentage,
            min_amount: correctPlan.min_amount,
            max_amount: correctPlan.max_amount,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingPlan.id);

        if (updateError) {
          console.error(`Error updating ${correctPlan.name}:`, updateError);
        } else {
          updatedPlans.push({
            id: existingPlan.id,
            name: correctPlan.name,
            old_daily_roi: existingPlan.daily_roi_percentage,
            new_daily_roi: correctPlan.daily_roi_percentage,
            old_total_rate: existingPlan.daily_roi_percentage * existingPlan.duration_days,
            new_total_rate: correctPlan.daily_roi_percentage * correctPlan.duration_days,
            payout_type: correctPlan.payout_type
          });
          console.log(`✅ Updated ${correctPlan.name}: ${correctPlan.daily_roi_percentage}% daily`);
        }
      } else {
        // Create new plan
        const { data: newPlan, error: createError } = await admin
          .from("investment_plans")
          .insert({
            name: correctPlan.name,
            description: `${correctPlan.name} - ${correctPlan.payout_type === 'end' ? 'End payout' : 'Daily payout'}`,
            duration_days: correctPlan.duration_days,
            daily_roi_percentage: correctPlan.daily_roi_percentage,
            min_amount: correctPlan.min_amount,
            max_amount: correctPlan.max_amount,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating ${correctPlan.name}:`, createError);
        } else {
          createdPlans.push({
            id: newPlan.id,
            name: correctPlan.name,
            daily_roi: correctPlan.daily_roi_percentage,
            total_rate: correctPlan.daily_roi_percentage * correctPlan.duration_days,
            payout_type: correctPlan.payout_type
          });
          console.log(`✅ Created ${correctPlan.name}: ${correctPlan.daily_roi_percentage}% daily`);
        }
      }
    }

    // Also fix existing user investments that have wrong rates
    const { data: userInvestments, error: investmentError } = await admin
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    let fixedInvestments = [];
    
    if (userInvestments) {
      for (const investment of userInvestments) {
        // Find the correct plan
        const correctPlan = correctPlans.find(p => p.duration_days === investment.duration_days);
        
        if (correctPlan && investment.daily_roi_percentage !== correctPlan.daily_roi_percentage) {
          const { error: updateInvestmentError } = await admin
            .from("user_investments")
            .update({
              daily_roi_percentage: correctPlan.daily_roi_percentage
            })
            .eq("id", investment.id);

          if (!updateInvestmentError) {
            fixedInvestments.push({
              id: investment.id,
              amount: investment.amount_invested,
              old_daily_roi: investment.daily_roi_percentage,
              new_daily_roi: correctPlan.daily_roi_percentage,
              old_total_rate: investment.daily_roi_percentage * investment.duration_days,
              new_total_rate: correctPlan.daily_roi_percentage * investment.duration_days
            });
            console.log(`✅ Fixed user investment ${investment.id}: ${correctPlan.daily_roi_percentage}% daily`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Investment plans database fixed successfully',
      results: {
        updated_plans: updatedPlans,
        created_plans: createdPlans,
        fixed_user_investments: fixedInvestments,
        correct_plan_structure: correctPlans.map(p => ({
          name: p.name,
          duration: `${p.duration_days} days`,
          daily_rate: `${p.daily_roi_percentage}%`,
          total_rate: `${(p.daily_roi_percentage * p.duration_days).toFixed(1)}%`,
          payout_type: p.payout_type
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Plans fix error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
