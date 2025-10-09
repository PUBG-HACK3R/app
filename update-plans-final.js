const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePlans() {
  try {
    console.log('🚀 Starting database plans update...');

    // Get current plans to disable them
    const { data: currentPlans } = await supabase
      .from('investment_plans')
      .select('id');

    if (currentPlans && currentPlans.length > 0) {
      console.log('🔄 Disabling existing plans...');
      for (const plan of currentPlans) {
        await supabase
          .from('investment_plans')
          .update({ is_active: false })
          .eq('id', plan.id);
      }

      console.log('🗑️ Removing old plans...');
      for (const plan of currentPlans) {
        await supabase
          .from('investment_plans')
          .delete()
          .eq('id', plan.id);
      }
    }

    // Insert new plans
    console.log('📦 Inserting new plans...');
    const newPlans = [
      {
        name: 'Daily Plan',
        description: 'Quick returns - 1 day investment with 2% daily ROI',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.0,
        duration_days: 1,
        is_active: true
      },
      {
        name: '3-Day Plan',
        description: 'Short term investment - 3 days with 2.3% daily ROI',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.3,
        duration_days: 3,
        is_active: true
      },
      {
        name: '10-Day Plan',
        description: 'Medium term investment - 10 days with 2.6% daily ROI',
        min_amount: 200.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.6,
        duration_days: 10,
        is_active: true
      },
      {
        name: 'Monthly Plan',
        description: 'Long term investment - 1 month with 120% total return at completion',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 120.0,
        duration_days: 30,
        is_active: true
      },
      {
        name: 'Bi-Monthly Plan',
        description: 'Extended investment - 2 months with 150% total return at completion',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 150.0,
        duration_days: 60,
        is_active: true
      }
    ];

    const { data: insertedPlans, error: insertError } = await supabase
      .from('investment_plans')
      .insert(newPlans)
      .select();

    if (insertError) {
      console.error('Error inserting plans:', insertError);
      return;
    }

    console.log('✅ Successfully inserted new plans:');
    insertedPlans.forEach(plan => {
      const payoutDesc = plan.name.includes('Monthly') ? 'total at end' : 'daily';
      console.log(`  - ${plan.name}: $${plan.min_amount}-$${plan.max_amount} USDT, ${plan.daily_roi_percentage}% ${payoutDesc}, ${plan.duration_days} days`);
    });

    console.log('🎉 Database update completed successfully!');

    // Verify the update
    console.log('\n📋 Current active plans:');
    const { data: verifyPlans } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('is_active', true)
      .order('duration_days');

    verifyPlans.forEach(plan => {
      console.log(`  ✓ ${plan.name}: ${plan.duration_days} days, ${plan.daily_roi_percentage}%`);
    });

  } catch (error) {
    console.error('❌ Error updating database:', error);
  }
}

updatePlans();
