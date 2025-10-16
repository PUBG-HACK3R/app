#!/usr/bin/env node

/**
 * Simulate NOWPayments Webhook Call
 * 
 * This script simulates a webhook call to test the deposit confirmation process
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateWebhook(orderId) {
  console.log(`🧪 Simulating webhook for order: ${orderId}\n`);

  try {
    // First, get the deposit
    const { data: deposit, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      console.error('❌ Error getting deposit:', error);
      return;
    }

    if (!deposit) {
      console.error('❌ Deposit not found');
      return;
    }

    console.log('📋 Deposit details:', {
      order_id: deposit.order_id,
      user_id: deposit.user_id,
      amount: deposit.amount_usdt,
      status: deposit.status
    });

    if (deposit.status === 'confirmed') {
      console.log('⚠️ Deposit already confirmed');
      return;
    }

    // Simulate the webhook payload
    const webhookPayload = {
      order_id: orderId,
      payment_status: 'finished',
      payment_id: `sim_${Date.now()}`,
      payin_hash: `sim_hash_${Date.now()}`
    };

    console.log('\n🔄 Simulating webhook payload:', webhookPayload);

    // Make HTTP request to the webhook endpoint
    const webhookUrl = `http://localhost:3000/api/nowpayments/webhook`;
    
    console.log(`📡 Sending webhook to: ${webhookUrl}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nowpayments-sig': 'test_signature' // This will fail signature verification, but we can test the logic
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.text();
    console.log('\n📥 Webhook response:', {
      status: response.status,
      body: result
    });

    // Check if deposit was updated
    const { data: updatedDeposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('order_id', orderId)
      .single();

    console.log('\n📊 Updated deposit status:', {
      status: updatedDeposit?.status,
      payment_id: updatedDeposit?.payment_id,
      confirmed_at: updatedDeposit?.confirmed_at
    });

  } catch (error) {
    console.error('❌ Error in simulation:', error);
  }
}

// Get order ID from command line
const orderId = process.argv[2];

if (!orderId) {
  console.log('Usage: node simulate-webhook.js [order_id]');
  console.log('Example: node simulate-webhook.js dep_1760633040436');
  process.exit(1);
}

simulateWebhook(orderId);
