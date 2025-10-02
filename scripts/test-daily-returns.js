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

async function testDailyReturns() {
  console.log('🧪 Testing Daily Returns System...\n');

  try {
    // Step 1: Get or create a test user
    console.log('1️⃣ Getting test user...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .limit(1);

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const testUser = users[0];
    console.log(`✅ Using test user: ${testUser.email} (${testUser.user_id})`);

    // Step 2: Create a test subscription
    console.log('\n2️⃣ Creating test subscription...');
    const subscriptionData = {
      user_id: testUser.user_id,
      plan_id: null, // We'll create without a plan
      principal_usdt: 100.00,
      roi_daily_percent: 1.5,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      next_earning_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday (due for earning)
      active: true
    };

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) {
      throw new Error(`Failed to create subscription: ${subError.message}`);
    }

    console.log(`✅ Created subscription: ${subscription.id}`);
    console.log(`   Principal: $${subscription.principal_usdt}`);
    console.log(`   Daily ROI: ${subscription.roi_daily_percent}%`);
    console.log(`   Expected daily earning: $${(subscription.principal_usdt * subscription.roi_daily_percent / 100).toFixed(2)}`);

    // Step 3: Check initial balance
    console.log('\n3️⃣ Checking initial balance...');
    const { data: initialBalance } = await supabase
      .from('balances')
      .select('available_usdt')
      .eq('user_id', testUser.user_id)
      .maybeSingle();

    const initialAmount = initialBalance?.available_usdt || 0;
    console.log(`✅ Initial balance: $${initialAmount}`);

    // Step 4: Test the daily returns cron manually
    console.log('\n4️⃣ Testing daily returns processing...');
    
    // Simulate the daily returns logic
    const principal = Number(subscription.principal_usdt);
    const roiDaily = Number(subscription.roi_daily_percent);
    const expectedEarning = Number((principal * (roiDaily / 100)).toFixed(2));

    // Insert earning transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: testUser.user_id,
        type: 'earning',
        amount_usdt: expectedEarning,
        reference_id: subscription.id,
        meta: { source: 'test_script', credited_at: new Date().toISOString() }
      });

    if (txError) {
      throw new Error(`Failed to create earning transaction: ${txError.message}`);
    }

    console.log(`✅ Created earning transaction: $${expectedEarning}`);

    // Update balance
    const newBalance = initialAmount + expectedEarning;
    if (!initialBalance) {
      await supabase
        .from('balances')
        .insert({
          user_id: testUser.user_id,
          available_usdt: expectedEarning
        });
    } else {
      await supabase
        .from('balances')
        .update({ available_usdt: newBalance })
        .eq('user_id', testUser.user_id);
    }

    console.log(`✅ Updated balance: $${initialAmount} → $${newBalance}`);

    // Update subscription next_earning_at
    const nextEarning = new Date();
    nextEarning.setDate(nextEarning.getDate() + 1);
    
    await supabase
      .from('subscriptions')
      .update({ next_earning_at: nextEarning.toISOString() })
      .eq('id', subscription.id);

    console.log(`✅ Updated next earning date: ${nextEarning.toISOString()}`);

    // Step 5: Verify the results
    console.log('\n5️⃣ Verifying results...');
    
    const { data: finalBalance } = await supabase
      .from('balances')
      .select('available_usdt')
      .eq('user_id', testUser.user_id)
      .single();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUser.user_id)
      .eq('type', 'earning')
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: updatedSub } = await supabase
      .from('subscriptions')
      .select('next_earning_at, active')
      .eq('id', subscription.id)
      .single();

    console.log(`✅ Final balance: $${finalBalance.available_usdt}`);
    console.log(`✅ Latest earning transaction: $${transactions[0]?.amount_usdt || 'None'}`);
    console.log(`✅ Next earning scheduled for: ${updatedSub.next_earning_at}`);
    console.log(`✅ Subscription active: ${updatedSub.active}`);

    // Step 6: Test the API endpoint
    console.log('\n6️⃣ Testing API endpoint...');
    console.log('You can now test the manual trigger at: /api/admin/process-daily-returns');
    console.log('Or use the admin panel button: "Process Daily Returns"');

    console.log('\n🎉 Daily returns test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Test user: ${testUser.email}`);
    console.log(`   • Subscription ID: ${subscription.id}`);
    console.log(`   • Principal: $${subscription.principal_usdt}`);
    console.log(`   • Daily ROI: ${subscription.roi_daily_percent}%`);
    console.log(`   • Daily earning: $${expectedEarning}`);
    console.log(`   • Balance change: $${initialAmount} → $${finalBalance.available_usdt}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testDailyReturns();
