# Blockchain Configuration Guide

## Required Environment Variables

### Database Configuration
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cron Job Authentication
CRON_SECRET=your_secure_random_string
```

### TRON Network Configuration
```
# TRON Master Private Key (for generating user deposit addresses)
TRON_PRIVATE_KEY=your_tron_master_private_key

# TRON Contract Addresses
NEXT_PUBLIC_USDT_TRC20_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
NEXT_PUBLIC_HOT_WALLET_TRC20_ADDRESS=your_tron_hot_wallet_address
```

### Arbitrum Network Configuration
```
# Arbitrum Master Private Key (for generating user deposit addresses)
ARBITRUM_PRIVATE_KEY=your_arbitrum_master_private_key

# Arbitrum RPC URL
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Arbitrum Contract Addresses
NEXT_PUBLIC_USDT_ARBITRUM_ADDRESS=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
NEXT_PUBLIC_HOT_WALLET_ARBITRUM_ADDRESS=your_arbitrum_hot_wallet_address
```

## Security Notes

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

1. **Private Keys**: Never commit private keys to version control
2. **Master Keys**: Use secure, randomly generated private keys
3. **Hot Wallets**: Use dedicated addresses for receiving forwarded funds
4. **Environment**: Keep all sensitive data in environment variables

## Contract Addresses (Mainnet)

### TRON (TRC20)
- **USDT Contract**: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- **Network**: TRON Mainnet

### Arbitrum
- **USDT Contract**: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`
- **Chain ID**: 42161
- **Network**: Arbitrum One

## Testing Recommendations

### Phase 1: Testnet Testing
1. Use TRON Shasta testnet for initial testing
2. Use Arbitrum Goerli testnet for Ethereum-based testing
3. Test with small amounts first

### Phase 2: Mainnet Testing
1. Start with $1-5 USDT deposits
2. Verify address generation works correctly
3. Confirm deposit detection and forwarding
4. Test balance crediting system

### Phase 3: Production Deployment
1. Monitor cron jobs regularly
2. Set up alerts for failed transactions
3. Implement backup monitoring systems
4. Regular security audits

## Cron Job Schedule

The system requires these cron jobs to be set up:

1. **Deposit Detection**: Every 30 seconds
   - URL: `/api/cron/detect-deposits`
   - Detects new deposits on blockchain

2. **Auto Forward**: Every 2 minutes
   - URL: `/api/cron/auto-forward-deposits`
   - Forwards deposits to hot wallet

3. **Balance Monitor**: Every 2 minutes
   - URL: `/api/cron/auto-deposit-monitor`
   - Credits user balances

4. **Daily Earnings**: Daily at midnight
   - URL: `/api/cron/daily-earnings`
   - Processes investment returns

5. **Withdrawal Timeout**: Every hour
   - URL: `/api/cron/withdrawal-timeout`
   - Handles withdrawal timeouts

## Troubleshooting

### Common Issues:

1. **Address Generation Fails**
   - Check private key format
   - Verify TronWeb/ethers installation

2. **Deposit Detection Not Working**
   - Verify contract addresses
   - Check RPC endpoints
   - Monitor API rate limits

3. **Forwarding Fails**
   - Ensure sufficient gas/TRX in deposit addresses
   - Check hot wallet addresses
   - Verify private key permissions

### Monitoring:

- Check cron job logs regularly
- Monitor blockchain transaction confirmations
- Set up alerts for failed operations
- Track gas fee consumption
