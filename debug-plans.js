// Debug script to check plans in database
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPlans() {
  try {
    console.log('🔍 Checking plans in database...\n');

    // Get all plans
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('min_amount', { ascending: true });

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
      return;
    }

    if (!plans || plans.length === 0) {
      console.log('⚠️  No plans found in database!');
      console.log('You need to add some plans to the database first.');
      return;
    }

    console.log(`✅ Found ${plans.length} plans:`);
    plans.forEach((plan, index) => {
      console.log(`\n${index + 1}. ${plan.name}`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Price: $${plan.min_amount}`);
      console.log(`   ROI: ${plan.roi_daily_percent}% daily`);
      console.log(`   Duration: ${plan.duration_days} days`);
      console.log(`   Active: ${plan.is_active}`);
      
      // Check if ID is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidRegex.test(plan.id);
      console.log(`   Valid UUID: ${isValidUUID ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
}

debugPlans();
