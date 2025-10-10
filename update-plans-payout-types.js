const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePayoutTypes() {
  try {
    console.log('🚀 Updating plan payout types...');

    // Get current plans
    const { data: plans } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('is_active', true);

    console.log('Current plans:', plans?.map(p => ({ name: p.name, duration: p.duration_days })));

    // Update payout types based on duration
    for (const plan of plans || []) {
      let payoutType = 'daily';
      
      // Monthly and Bi-Monthly plans should pay at end
      if (plan.duration_days >= 30) {
        payoutType = 'end';
      }

      const { error } = await supabase
        .from('investment_plans')
        .update({ payout_type: payoutType })
        .eq('id', plan.id);

      if (error) {
        console.error(`Error updating ${plan.name}:`, error);
      } else {
        console.log(`✅ Updated ${plan.name} (${plan.duration_days} days) to ${payoutType} payout`);
      }
    }

    // Verify updates
    console.log('\n📋 Updated plans:');
    const { data: updatedPlans } = await supabase
      .from('investment_plans')
      .select('name, duration_days, daily_roi_percentage, payout_type')
      .eq('is_active', true)
      .order('duration_days');

    updatedPlans?.forEach(plan => {
      const payoutDesc = plan.payout_type === 'end' ? 'at completion' : 'daily';
      console.log(`  ✓ ${plan.name}: ${plan.duration_days} days, ${plan.daily_roi_percentage}% ${payoutDesc}`);
    });

    console.log('🎉 Payout types updated successfully!');

  } catch (error) {
    console.error('❌ Error updating payout types:', error);
  }
}

updatePayoutTypes();
