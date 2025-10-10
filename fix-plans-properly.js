const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPlansCorrectly() {
  try {
    console.log('🚀 Fixing plans with correct values...');

    // Delete all existing plans
    console.log('🗑️ Removing all existing plans...');
    const { error: deleteError } = await supabase
      .from('investment_plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting plans:', deleteError);
    }

    // Insert correct plans in proper sequence
    console.log('📦 Inserting correct plans...');
    const correctPlans = [
      {
        name: '1-Day Plan',
        description: '1 day investment with 2% daily return',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.00,
        duration_days: 1,
        is_active: true
      },
      {
        name: '3-Day Plan', 
        description: '3 days investment with 2.3% daily return',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.30,
        duration_days: 3,
        is_active: true
      },
      {
        name: '10-Day Plan',
        description: '10 days investment with 2.6% daily return',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.60,
        duration_days: 10,
        is_active: true
      },
      {
        name: 'Monthly Plan',
        description: '1 month investment with 120% return at end',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 120.00, // 120% total return
        duration_days: 30,
        is_active: true
      },
      {
        name: 'Bi-Monthly Plan',
        description: '2 months investment with 150% return at end',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 150.00, // 150% total return
        duration_days: 60,
        is_active: true
      }
    ];

    const { data: insertedPlans, error: insertError } = await supabase
      .from('investment_plans')
      .insert(correctPlans)
      .select();

    if (insertError) {
      console.error('Error inserting plans:', insertError);
      return;
    }

    console.log('✅ Successfully inserted correct plans:');
    insertedPlans.forEach((plan, index) => {
      const payoutType = plan.duration_days >= 30 ? 'at end' : 'daily';
      console.log(`${index + 1}. ${plan.name}:`);
      console.log(`   - Duration: ${plan.duration_days} days`);
      console.log(`   - Amount: $${plan.min_amount} - $${plan.max_amount.toLocaleString()}`);
      console.log(`   - Return: ${plan.daily_roi_percentage}% ${payoutType}`);
      console.log(`   - Description: ${plan.description}`);
      console.log('');
    });

    console.log('🎉 Database plans fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing plans:', error);
  }
}

fixPlansCorrectly();
