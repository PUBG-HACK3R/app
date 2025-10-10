const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPlansCurrentSchema() {
  try {
    console.log('🚀 Fixing plans with current schema constraints...');

    // Delete all existing plans
    console.log('🗑️ Removing all existing plans...');
    const { error: deleteError } = await supabase
      .from('investment_plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting plans:', deleteError);
    }

    // Insert plans that fit current DECIMAL(5,3) constraint
    // For monthly plans, we'll use a marker value and handle display in frontend
    console.log('📦 Inserting plans with current schema...');
    const correctPlans = [
      {
        name: '1-Day Plan',
        description: '1 day investment with 2% daily return',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.000, // 2% daily
        duration_days: 1,
        is_active: true
      },
      {
        name: '3-Day Plan', 
        description: '3 days investment with 2.3% daily return',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.300, // 2.3% daily
        duration_days: 3,
        is_active: true
      },
      {
        name: '10-Day Plan',
        description: '10 days investment with 2.6% daily return',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.600, // 2.6% daily
        duration_days: 10,
        is_active: true
      },
      {
        name: 'Monthly Plan',
        description: '1 month investment with 120% return at end',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 99.999, // Max value for DECIMAL(5,3) - will represent 120% in frontend
        duration_days: 30,
        is_active: true
      },
      {
        name: 'Bi-Monthly Plan',
        description: '2 months investment with 150% return at end',
        min_amount: 50.00,
        max_amount: 100000.00,
        daily_roi_percentage: 99.998, // Max value for DECIMAL(5,3) - will represent 150% in frontend
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

    console.log('✅ Successfully inserted plans:');
    insertedPlans.forEach((plan, index) => {
      let displayROI = plan.daily_roi_percentage;
      let payoutType = 'daily';
      
      if (plan.duration_days >= 30) {
        payoutType = 'at end';
        displayROI = plan.duration_days === 30 ? 120 : 150; // Override for display
      }
      
      console.log(`${index + 1}. ${plan.name}:`);
      console.log(`   - Duration: ${plan.duration_days} days`);
      console.log(`   - Amount: $${plan.min_amount} - $${plan.max_amount.toLocaleString()}`);
      console.log(`   - Return: ${displayROI}% ${payoutType}`);
      console.log(`   - Description: ${plan.description}`);
      console.log('');
    });

    console.log('🎉 Database plans updated successfully!');
    console.log('📝 Note: Frontend will handle correct display of 120% and 150% for monthly plans');

  } catch (error) {
    console.error('❌ Error fixing plans:', error);
  }
}

fixPlansCurrentSchema();
