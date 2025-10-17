const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestWithdrawal() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);
  
  const { data, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: '89bd2b50-da52-4ccd-bc5a-ecbabd663838',
      amount_usdt: 50,
      fee_usdt: 2.5,
      net_amount_usdt: 47.5,
      wallet_address: '0x742d35Cc6634C0532925a3b8D4f25177CF1aF4b5',
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Test withdrawal created:', data.id);
    console.log('   Amount: $50 USDT');
    console.log('   Status: pending');
    console.log('   Address: 0x742d35Cc6634C0532925a3b8D4f25177CF1aF4b5');
  }
}

createTestWithdrawal();
