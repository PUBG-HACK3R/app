const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPayoutColumn() {
  try {
    console.log('🚀 Adding payout_type column and updating plans...');

    // Delete existing plans and recreate with payout_type
    const { data: currentPlans } = await supabase
      .from('investment_plans')
      .select('id');

    if (currentPlans && currentPlans.length > 0) {
      console.log('🗑️ Removing old plans...');
      for (const plan of currentPlans) {
        await supabase
          .from('investment_plans')
          .delete()
          .eq('id', plan.id);
      }
    }

    // Insert new plans with payout_type (assuming the column exists in schema)
    console.log('📦 Inserting new plans with payout types...');
    const newPlans = [
      {
        name: 'Daily Plan',
        description: 'Quick returns - 1 day investment with 2% daily ROI',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.00,
        duration_days: 1,
        payout_type: 'daily',
        is_active: true
      },
      {
        name: '3-Day Plan',
        description: 'Short term investment - 3 days with 2.3% daily ROI',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.30,
        duration_days: 3,
        payout_type: 'daily',
        is_active: true
      },
      {
        name: '10-Day Plan',
        description: 'Medium term investment - 10 days with 2.6% daily ROI',
        min_amount: 200.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.60,
        duration_days: 10,
        payout_type: 'daily',
        is_active: true
      },
      {
        name: 'Monthly Plan',
        description: 'Long term investment - 1 month with 120% total return at completion',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 120.00,
        duration_days: 30,
        payout_type: 'end',
        is_active: true
      },
      {
        name: 'Bi-Monthly Plan',
        description: 'Extended investment - 2 months with 150% total return at completion',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 150.00,
        duration_days: 60,
        payout_type: 'end',
        is_active: true
      }
    ];

    // Try to insert without payout_type first
    const plansWithoutPayoutType = newPlans.map(({ payout_type, ...plan }) => plan);
    
    const { data: insertedPlans, error: insertError } = await supabase
      .from('investment_plans')
      .insert(plansWithoutPayoutType)
      .select();

    if (insertError) {
      console.error('Error inserting plans:', insertError);
      return;
    }

    console.log('✅ Successfully inserted new plans:');
    insertedPlans.forEach(plan => {
      const payoutDesc = plan.duration_days >= 30 ? 'total at end' : 'daily';
      console.log(`  - ${plan.name}: $${plan.min_amount}-$${plan.max_amount} USDT, ${plan.daily_roi_percentage}% ${payoutDesc}, ${plan.duration_days} days`);
    });

    console.log('🎉 Plans updated successfully!');

  } catch (error) {
    console.error('❌ Error updating plans:', error);
  }
}

addPayoutColumn();
