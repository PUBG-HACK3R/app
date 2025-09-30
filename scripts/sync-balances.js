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

async function syncBalances() {
  try {
    console.log('🔄 Synchronizing balances...');
    
    // Get all users with transactions
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id');
    
    if (usersError) {
      throw usersError;
    }
    
    console.log(`📊 Found ${users.length} users to sync`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Calculate balance from transactions
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('type, amount_usdt')
          .eq('user_id', user.user_id);
        
        if (txError) {
          console.error(`❌ Error fetching transactions for ${user.user_id}:`, txError.message);
          errorCount++;
          continue;
        }
        
        const totalDeposits = (transactions || [])
          .filter(t => t.type === 'deposit')
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        
        const totalEarnings = (transactions || [])
          .filter(t => t.type === 'earning')
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        
        const totalWithdrawals = (transactions || [])
          .filter(t => t.type === 'withdrawal')
          .reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);
        
        const calculatedBalance = totalDeposits + totalEarnings - totalWithdrawals;
        
        // Get current balance from balances table
        const { data: currentBalance } = await supabase
          .from('balances')
          .select('available_usdt')
          .eq('user_id', user.user_id)
          .maybeSingle();
        
        const currentAmount = Number(currentBalance?.available_usdt || 0);
        
        // Only update if there's a difference
        if (Math.abs(calculatedBalance - currentAmount) > 0.01) {
          const { error: updateError } = await supabase
            .from('balances')
            .upsert({
              user_id: user.user_id,
              available_usdt: calculatedBalance
            }, { onConflict: 'user_id' });
          
          if (updateError) {
            console.error(`❌ Error updating balance for ${user.user_id}:`, updateError.message);
            errorCount++;
            continue;
          }
          
          console.log(`✅ Synced ${user.user_id}: $${currentAmount.toFixed(2)} → $${calculatedBalance.toFixed(2)}`);
          syncedCount++;
        } else {
          console.log(`✓ ${user.user_id}: Already in sync ($${calculatedBalance.toFixed(2)})`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 Synchronization Summary:');
    console.log(`   Users processed: ${users.length}`);
    console.log(`   Balances synced: ${syncedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('✅ Balance synchronization completed!');
    
  } catch (error) {
    console.error('❌ Error during balance sync:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncBalances();
