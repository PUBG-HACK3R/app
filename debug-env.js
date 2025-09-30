// Debug script to check environment variables
// Run with: node debug-env.js

console.log("=== Environment Variables Debug ===");
console.log("");

// Check if .env.local exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

console.log("1. Environment file check:");
console.log(`   .env.local exists: ${envExists}`);

if (!envExists) {
  console.log("   ❌ .env.local file is missing!");
  console.log("   📝 Create .env.local file with your environment variables");
  console.log("");
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log("2. Required environment variables:");

const requiredVars = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NOWPAYMENTS_API_KEY',
  'NOWPAYMENTS_IPN_SECRET'
];

const optionalVars = [
  'NEXT_PUBLIC_NOWPAYMENTS_CURRENCY',
  'NOWPAYMENTS_BASE_URL',
  'REVALIDATE_SECRET'
];

let missingRequired = [];
let missingOptional = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? (varName.includes('KEY') || varName.includes('SECRET') ? '[REDACTED]' : value) : 'MISSING';
  console.log(`   ${status} ${varName}: ${displayValue}`);
  if (!value) missingRequired.push(varName);
});

console.log("");
console.log("3. Optional environment variables:");

optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const displayValue = value ? (varName.includes('KEY') || varName.includes('SECRET') ? '[REDACTED]' : value) : 'NOT SET (using default)';
  console.log(`   ${status} ${varName}: ${displayValue}`);
  if (!value) missingOptional.push(varName);
});

console.log("");
console.log("=== Summary ===");

if (missingRequired.length > 0) {
  console.log("❌ CRITICAL: Missing required environment variables:");
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log("");
  console.log("🔧 Action needed:");
  console.log("   1. Create .env.local file in your project root");
  console.log("   2. Copy the template from docs/env.example.txt");
  console.log("   3. Fill in the missing values");
  console.log("   4. Restart your development server");
} else {
  console.log("✅ All required environment variables are set!");
}

if (missingOptional.length > 0) {
  console.log("");
  console.log("⚠️  Optional variables not set (using defaults):");
  missingOptional.forEach(varName => {
    console.log(`   - ${varName}`);
  });
}

console.log("");
console.log("=== NOWPayments Specific Checks ===");

if (!process.env.NOWPAYMENTS_API_KEY) {
  console.log("❌ NOWPayments API Key is missing!");
  console.log("   This is likely the cause of your 400 error.");
  console.log("   Get your API key from: https://nowpayments.io/");
} else {
  console.log("✅ NOWPayments API Key is configured");
}

const currency = process.env.NEXT_PUBLIC_NOWPAYMENTS_CURRENCY || 'USDTTRC20';
console.log(`💰 Payment currency: ${currency}`);

const baseUrl = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
console.log(`🌐 API Base URL: ${baseUrl}`);

console.log("");
console.log("=== Next Steps ===");
console.log("1. Fix any missing environment variables above");
console.log("2. Restart your development server (npm run dev)");
console.log("3. Try the deposit again");
console.log("4. Check browser console and server logs for detailed error messages");
