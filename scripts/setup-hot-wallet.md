# Hot Wallet Setup Instructions

Your hot wallet deposit functionality is not working because the environment variables are not properly configured. Here's how to fix it:

## 🚨 Current Issue
The hot wallet system is showing "Hot Wallet Not Configured" because these environment variables are missing or invalid:
- `NEXT_PUBLIC_USDT_ADDRESS`
- `NEXT_PUBLIC_HOT_WALLET_ADDRESS`

## ✅ Quick Fix Steps

### Step 1: Set Up Your Environment Variables

1. **Open your `.env.local` file** (create it if it doesn't exist)

2. **Add these variables** (replace with your actual values):

```bash
# Hot Wallet Configuration
HOT_PRIVATE_KEY=your_actual_private_key_here
RPC_URL=https://polygon-mumbai.infura.io/v3/your_infura_key
USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
HOT_WALLET_ADDRESS=your_actual_wallet_address_here

# Frontend Environment Variables (CRITICAL - these must be set)
NEXT_PUBLIC_USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
NEXT_PUBLIC_HOT_WALLET_ADDRESS=your_actual_wallet_address_here
```

### Step 2: Get Your Wallet Information

#### Option A: Use an Existing Wallet
1. Open MetaMask
2. Go to Account Details → Export Private Key
3. Copy the private key (starts with 0x...)
4. Copy your wallet address (also starts with 0x...)

#### Option B: Create a New Wallet (Recommended for Production)
1. Create a new wallet in MetaMask
2. Fund it with some MATIC for gas fees
3. Export the private key
4. Use this as your dedicated hot wallet

### Step 3: Set Up RPC Endpoint

1. Go to [Infura.io](https://infura.io) or [Alchemy.com](https://alchemy.com)
2. Create a free account
3. Create a new project for Polygon
4. Copy the HTTPS endpoint URL

### Step 4: Update Your .env.local

Your `.env.local` should look like this (with your actual values):

```bash
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NEXT_PUBLIC_NOWPAYMENTS_CURRENCY=usdttrc20
REVALIDATE_SECRET=your_revalidate_secret
ADMIN_SECRET=admin123

# Hot Wallet Configuration (ADD THESE)
HOT_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
RPC_URL=https://polygon-mumbai.infura.io/v3/abc123def456
USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
HOT_WALLET_ADDRESS=0x1234567890123456789012345678901234567890

# Frontend Variables (CRITICAL)
NEXT_PUBLIC_USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
NEXT_PUBLIC_HOT_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
```

### Step 5: Set Up Database Tables

1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Run the script from `scripts/create-hotwallet-tables.sql`

### Step 6: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

## 🧪 Testing

1. Go to `/wallet/deposit`
2. Enter an amount (e.g., $50)
3. Select "Hot Wallet" option
4. You should now see the wallet connection interface instead of the error message

## 📋 Network Configuration

### For Testing (Polygon Mumbai Testnet)
- **USDT Address**: Check [Mumbai PolygonScan](https://mumbai.polygonscan.com/) for current USDT contract
- **Chain ID**: 80001
- **RPC**: `https://polygon-mumbai.infura.io/v3/YOUR_KEY`

### For Production (Polygon Mainnet)
- **USDT Address**: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- **Chain ID**: 137
- **RPC**: `https://polygon-mainnet.infura.io/v3/YOUR_KEY`

## 🔒 Security Notes

- **Never commit your `.env.local` file to git**
- **Keep your private key secure** - it controls your hot wallet funds
- **Fund your hot wallet** with MATIC for gas fees
- **Test with small amounts first**

## ❓ Still Having Issues?

If you're still seeing the configuration error:

1. **Check your `.env.local` file exists** in the root directory
2. **Verify all variables are set** (no empty values)
3. **Restart your development server** completely
4. **Check the browser console** for any error messages
5. **Verify your wallet has MATIC** for gas fees

The hot wallet system will work alongside your existing NOWPayments system, giving users both options for deposits and withdrawals.
