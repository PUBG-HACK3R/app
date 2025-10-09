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

    // First, add payout_type column if it doesn't exist
    console.log('📝 Adding payout_type column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE investment_plans ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'daily' CHECK (payout_type IN ('daily', 'end'));`
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.error('Error adding column:', alterError);
    } else {
      console.log('✅ Column added successfully');
    }

    // Disable all existing plans
    console.log('🔄 Disabling existing plans...');
    const { error: disableError } = await supabase
      .from('investment_plans')
      .update({ is_active: false });

    if (disableError) {
      console.error('Error disabling plans:', disableError);
      return;
    }

    // Delete existing plans
    console.log('🗑️ Removing old plans...');
    const { error: deleteError } = await supabase
      .from('investment_plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting plans:', deleteError);
      return;
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
        payout_type: 'daily',
        is_active: true
      },
      {
        name: '3-Day Plan',
        description: 'Short term investment - 3 days with 2.3% daily ROI',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.3,
        duration_days: 3,
        payout_type: 'daily',
        is_active: true
      },
      {
        name: '10-Day Plan',
        description: 'Medium term investment - 10 days with 2.6% daily ROI',
        min_amount: 200.00,
        max_amount: 100000.00,
        daily_roi_percentage: 2.6,
        duration_days: 10,
        payout_type: 'daily',
        is_active: true
      },
      {
        name: 'Monthly Plan',
        description: 'Long term investment - 1 month with 120% total return at completion',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 120.0,
        duration_days: 30,
        payout_type: 'end',
        is_active: true
      },
      {
        name: 'Bi-Monthly Plan',
        description: 'Extended investment - 2 months with 150% total return at completion',
        min_amount: 100.00,
        max_amount: 100000.00,
        daily_roi_percentage: 150.0,
        duration_days: 60,
        payout_type: 'end',
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
      console.log(`  - ${plan.name}: ${plan.min_amount}-${plan.max_amount} USDT, ${plan.daily_roi_percentage}% ${plan.payout_type === 'end' ? 'total' : 'daily'}, ${plan.duration_days} days`);
    });

    console.log('🎉 Database update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating database:', error);
  }
}

updatePlans();
