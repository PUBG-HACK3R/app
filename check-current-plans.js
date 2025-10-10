const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCurrentPlans() {
  try {
    console.log('🔍 Checking current database plans...');

    // Check current plans
    const { data: plans, error } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('is_active', true)
      .order('duration_days');

    if (error) {
      console.error('Error fetching plans:', error);
      return;
    }

    console.log('\n📋 Current Plans in Database:');
    if (plans && plans.length > 0) {
      plans.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name}:`);
        console.log(`   - Duration: ${plan.duration_days} days`);
        console.log(`   - Min: $${plan.min_amount}, Max: $${plan.max_amount}`);
        console.log(`   - ROI: ${plan.daily_roi_percentage}%`);
        console.log(`   - Description: ${plan.description || 'N/A'}`);
        console.log(`   - ID: ${plan.id}`);
        console.log('');
      });
    } else {
      console.log('❌ No active plans found!');
    }

    // Check table structure
    console.log('🔍 Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('investment_plans')
      .select('*')
      .limit(1);

    if (tableInfo && tableInfo.length > 0) {
      console.log('\n📊 Table Columns Available:');
      Object.keys(tableInfo[0]).forEach(column => {
        console.log(`   - ${column}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentPlans();
