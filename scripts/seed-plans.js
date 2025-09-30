const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const initialPlans = [
  {
    name: "Starter Portfolio",
    price_usdt: 50.00,
    roi_daily_percent: 1.0,
    duration_days: 30,
    is_active: true
  },
  {
    name: "Professional Growth",
    price_usdt: 200.00,
    roi_daily_percent: 1.2,
    duration_days: 45,
    is_active: true
  },
  {
    name: "Elite Investment",
    price_usdt: 500.00,
    roi_daily_percent: 1.5,
    duration_days: 60,
    is_active: true
  }
];

async function seedPlans() {
  try {
    console.log('🌱 Seeding plans...');
    
    // Check if plans already exist
    const { data: existingPlans, error: fetchError } = await supabase
      .from('plans')
      .select('id, name');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (existingPlans && existingPlans.length > 0) {
      console.log(`📋 Found ${existingPlans.length} existing plans:`);
      existingPlans.forEach(plan => {
        console.log(`   - ${plan.name} (${plan.id})`);
      });
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Do you want to add more plans anyway? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('✅ Seeding cancelled. Existing plans preserved.');
        return;
      }
    }
    
    // Insert plans
    const { data: insertedPlans, error: insertError } = await supabase
      .from('plans')
      .insert(initialPlans)
      .select();
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('✅ Successfully seeded plans:');
    insertedPlans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price_usdt} (${plan.roi_daily_percent}%/day for ${plan.duration_days} days)`);
    });
    
    console.log('\n📊 Plan Summary:');
    insertedPlans.forEach(plan => {
      const totalReturn = (plan.price_usdt * (plan.roi_daily_percent / 100) * plan.duration_days + plan.price_usdt).toFixed(2);
      const totalProfit = (plan.price_usdt * (plan.roi_daily_percent / 100) * plan.duration_days).toFixed(2);
      const totalROI = ((parseFloat(totalProfit) / plan.price_usdt) * 100).toFixed(1);
      
      console.log(`   ${plan.name}:`);
      console.log(`     Investment: $${plan.price_usdt}`);
      console.log(`     Total Return: $${totalReturn}`);
      console.log(`     Total Profit: $${totalProfit}`);
      console.log(`     Total ROI: ${totalROI}%`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error seeding plans:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedPlans();
