// Test script to verify webhook endpoint
// Run with: node test-webhook.js

const crypto = require('crypto');

const testPayload = {
  order_id: "dep_test_123456789",
  payment_status: "confirmed",
  payment_id: "test_payment_id",
  amount: "50.00",
  currency: "USDTTRC20"
};

const secret = "your-ipn-secret-here"; // Replace with your actual secret
const message = JSON.stringify(testPayload, Object.keys(testPayload).sort());
const signature = crypto.createHmac('sha512', secret).update(message).digest('hex');

console.log('Test Payload:', JSON.stringify(testPayload, null, 2));
console.log('Signature:', signature);
console.log('\nCurl command to test:');
console.log(`curl -X POST https://your-domain.vercel.app/api/nowpayments/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-nowpayments-sig: ${signature}" \\
  -d '${JSON.stringify(testPayload)}'`);
