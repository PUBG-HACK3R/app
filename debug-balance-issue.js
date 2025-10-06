// Debug script to check balance issue
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBalance() {
  try {
    console.log('🔍 Debugging balance issue...\n');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email, role');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ID: ${user.user_id}`);
    });

    // Check balances table
    console.log('\n💰 Checking balances table...');
    const { data: balances, error: balancesError } = await supabase
      .from('balances')
      .select('*');

    if (balancesError) {
      console.error('Error fetching balances:', balancesError);
    } else {
      console.log(`Found ${balances.length} balance records:`);
      balances.forEach(balance => {
        console.log(`- User ${balance.user_id}: $${balance.available_usdt}`);
      });
    }

    // Check recent transactions
    console.log('\n📊 Checking recent transactions...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.error('Error fetching transactions:', txError);
    } else {
      console.log(`Found ${transactions.length} recent transactions:`);
      transactions.forEach(tx => {
        console.log(`- ${tx.type}: $${tx.amount_usdt} for user ${tx.user_id} - ${tx.description || 'No description'}`);
      });
    }

  } catch (error) {
    console.error('Debug script error:', error);
  }
}

debugBalance();
