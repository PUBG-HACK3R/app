# Hot Wallet System Setup Guide

This guide explains how to set up the new hot wallet deposit and withdrawal system that works alongside your existing NOWPayments system.

## Overview

The hot wallet system allows users to:
- **Deposit**: Send USDT directly from MetaMask/TrustWallet to your hot wallet
- **Withdraw**: Request withdrawals that are processed directly from your hot wallet to their address

This system is **completely separate** from your existing NOWPayments system and both can operate simultaneously.

## Environment Variables

Add these new environment variables to your `.env.local` file (don't overwrite existing ones):

```bash
# Hot Wallet Configuration
HOT_PRIVATE_KEY=your_private_key_here
RPC_URL=https://polygon-mumbai.infura.io/v3/your_infura_key
USDT_ADDRESS=0x... # USDT contract address on Polygon Mumbai
HOT_WALLET_ADDRESS=0x... # Your hot wallet public address

# Frontend Environment Variables (add to .env.local)
NEXT_PUBLIC_USDT_ADDRESS=0x... # Same as USDT_ADDRESS above
NEXT_PUBLIC_HOT_WALLET_ADDRESS=0x... # Same as HOT_WALLET_ADDRESS above
```

### Getting the Required Values

1. **HOT_PRIVATE_KEY**: 
   - Create a new wallet (MetaMask, etc.)
   - Export the private key (keep this VERY secure)
   - Fund this wallet with some MATIC for gas fees

2. **RPC_URL**: 
   - Sign up at [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/)
   - Create a new project for Polygon Mumbai
   - Copy the HTTPS endpoint

3. **USDT_ADDRESS**: 
   - Polygon Mumbai USDT contract: `0x... ` (get from PolygonScan)
   - For mainnet, use the official USDT contract address

4. **HOT_WALLET_ADDRESS**: 
   - The public address of your hot wallet (derived from HOT_PRIVATE_KEY)

## Database Setup

Run the SQL script to create the new tables:

```bash
# In your Supabase SQL editor, run:
# scripts/create-hotwallet-tables.sql
```

This creates:
- `hotwallet_deposits` table
- `hotwallet_withdrawals` table
- Proper indexes and RLS policies

## Network Configuration

### For Testing (Polygon Mumbai)
- Chain ID: 80001
- RPC URL: `https://polygon-mumbai.infura.io/v3/YOUR_KEY`
- Currency: MATIC (for gas)
- Block Explorer: https://mumbai.polygonscan.com/

### For Production (Polygon Mainnet)
- Chain ID: 137
- RPC URL: `https://polygon-mainnet.infura.io/v3/YOUR_KEY`
- Currency: MATIC (for gas)
- Block Explorer: https://polygonscan.com/

## Required Dependencies

The system uses these npm packages (should already be installed):
- `ethers` - For blockchain interactions
- `@types/node` - For TypeScript support

If not installed:
```bash
npm install ethers @types/node
```

## How It Works

### Deposit Flow
1. User enters amount on deposit page
2. Hot wallet connector appears below NOWPayments form
3. User connects MetaMask/TrustWallet
4. User approves USDT transfer to your hot wallet
5. Transaction is confirmed on blockchain
6. Frontend calls `/api/hotwallet-deposit` with transaction hash
7. System verifies and credits user's balance

### Withdrawal Flow
1. User enters amount and wallet address on withdrawal page
2. Hot wallet withdrawal form appears below regular withdrawal
3. User submits withdrawal request
4. Request is stored as "pending" in database
5. Admin uses `/api/hotwallet-approve-withdrawal` to process
6. System sends USDT from hot wallet to user's address
7. Transaction is confirmed and user is notified

## Admin Features

### Processing Withdrawals
Admins can process hot wallet withdrawals via API:

```bash
POST /api/hotwallet-approve-withdrawal
{
  "withdrawId": "uuid",
  "userWallet": "0x...",
  "amount": 100.50
}
```

### Monitoring
- All hot wallet transactions are logged in the main `transactions` table
- Hot wallet deposits/withdrawals have separate tracking tables
- Transaction hashes are stored for verification

## Security Features

- Private keys are server-side only
- All transactions are verified on blockchain
- Row Level Security (RLS) on database tables
- Admin authentication required for withdrawals
- Transaction amount validation
- Duplicate transaction prevention

## User Experience

### Deposit Page
- Users see both NOWPayments and Hot Wallet options
- Hot wallet option appears when amount is entered
- Real-time wallet connection status
- Network switching assistance
- Balance checking before transactions

### Withdrawal Page
- Users see both traditional and hot wallet withdrawal options
- Hot wallet withdrawals have no processing fees
- 15-minute processing window with countdown
- Real-time status updates

## Troubleshooting

### Common Issues

1. **"MetaMask not detected"**
   - User needs to install MetaMask or use TrustWallet
   - Check if `window.ethereum` is available

2. **"Wrong network"**
   - Guide user to switch to Polygon Mumbai/Mainnet
   - Provide network addition functionality

3. **"Insufficient USDT balance"**
   - User needs to have USDT in their wallet
   - Check balance before allowing transactions

4. **"Transaction failed"**
   - Check gas fees (user needs MATIC)
   - Verify contract addresses
   - Check RPC endpoint status

### Admin Troubleshooting

1. **Withdrawal processing fails**
   - Check hot wallet USDT balance
   - Verify hot wallet has MATIC for gas
   - Check RPC endpoint connectivity
   - Verify private key is correct

2. **Database errors**
   - Check Supabase connection
   - Verify table schemas are created
   - Check RLS policies

## Production Checklist

- [ ] Set up production hot wallet with sufficient USDT
- [ ] Fund hot wallet with MATIC for gas fees
- [ ] Update environment variables to Polygon Mainnet
- [ ] Test deposit flow end-to-end
- [ ] Test withdrawal flow end-to-end
- [ ] Set up monitoring for hot wallet balance
- [ ] Create backup procedures for private keys
- [ ] Test admin withdrawal processing
- [ ] Verify all transaction logging works

## Support

For issues with the hot wallet system:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Test with small amounts first
4. Check blockchain explorer for transaction status
5. Monitor server logs for API errors

The hot wallet system is designed to work alongside your existing NOWPayments system, giving users more flexibility in how they deposit and withdraw funds.
