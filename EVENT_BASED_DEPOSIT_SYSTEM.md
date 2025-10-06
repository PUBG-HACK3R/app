# Event-Based Deposit System Documentation

## Overview

This document describes the new event-based deposit system that replaces the expensive sub-wallet approach with efficient blockchain event monitoring. The system monitors TRC20 (TRON) and BEP20 (BSC) USDT transfers directly to main wallets.

## Architecture Comparison

### Old System (Sub-Wallets)
- ❌ Generated unique addresses for each user
- ❌ Required TRX/BNB gas funding for each address
- ❌ Complex forwarding mechanism
- ❌ High operational costs
- ❌ Scalability issues

### New System (Event-Based)
- ✅ Uses only main wallets (1 TRON + 1 BSC)
- ✅ No gas costs for users
- ✅ Direct event monitoring
- ✅ Highly scalable
- ✅ Cost-effective

## System Components

### 1. Database Schema
- **`deposit_intents`** - User deposit requests with unique reference codes
- **`event_deposit_transactions`** - Detected USDT transfers to main wallets
- **`block_tracker`** - Tracks last processed block for recovery
- **`main_wallets`** - Configuration for main wallet addresses

### 2. Event Listener Service
- **TypeScript Service** (`src/services/deposit-event-listener.ts`)
- **Standalone Node.js Service** (`services/standalone-deposit-listener.js`)
- **Cron Job Endpoint** (`src/app/api/cron/event-deposit-listener/route.ts`)

### 3. API Endpoints
- **POST** `/api/deposits/create-intent` - Create deposit request
- **GET** `/api/user/[id]/deposits` - Get user deposit history
- **GET** `/api/user/[id]/balance` - Get user balance with breakdown

## Setup Instructions

### 1. Database Migration

Run the database migration script:

```sql
-- Execute this in your Supabase SQL editor
\i scripts/event-based-deposit-system.sql
```

### 2. Configure Main Wallets

Update the main wallet addresses in the database:

```sql
-- Update with your actual main wallet addresses
UPDATE public.main_wallets SET 
  address = 'YOUR_TRON_MAIN_WALLET_ADDRESS'
WHERE network = 'TRC20';

UPDATE public.main_wallets SET 
  address = 'YOUR_BSC_MAIN_WALLET_ADDRESS'
WHERE network = 'BEP20';
```

### 3. Environment Variables

Add these environment variables to your `.env.local`:

```env
# Required for event listener
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
LISTENER_INTERVAL_MS=30000

# Existing variables (keep these)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

### 4. Deployment Options

#### Option A: Cron Job (Recommended for existing setup)

Add this cron job to your existing cron-job.org configuration:

```
URL: https://your-domain.com/api/cron/event-deposit-listener
Method: GET
Headers: Authorization: Bearer YOUR_CRON_SECRET
Schedule: Every 30 seconds (*/30 * * * * *)
```

#### Option B: Standalone Service (Recommended for production)

1. Navigate to the services directory:
```bash
cd services
npm install
```

2. Create environment file:
```bash
cp ../.env.local .env
```

3. Start with PM2:
```bash
npm run pm2:start
```

4. Monitor logs:
```bash
npm run pm2:logs
```

## How It Works

### 1. User Deposit Flow

1. **User creates deposit intent**:
   ```javascript
   POST /api/deposits/create-intent
   {
     "network": "TRC20",
     "amount_usdt": 100
   }
   ```

2. **System generates unique reference code**:
   ```json
   {
     "reference_code": "A1B2C3D4",
     "main_wallet_address": "TYour...MainWallet",
     "amount_usdt": 100,
     "expires_at": "2024-01-02T12:00:00Z"
   }
   ```

3. **User sends USDT to main wallet**:
   - Network: TRON (TRC20) or BSC (BEP20)
   - Address: Main wallet address
   - Amount: Exact amount specified
   - Memo/Reference: Reference code (optional but recommended)

### 2. Event Detection Flow

1. **Event listener monitors blockchain**:
   - TRC20: Monitors TRON USDT contract transfers
   - BEP20: Monitors BSC USDT contract transfers

2. **Transaction matching**:
   - Matches by amount (±5% tolerance)
   - Matches by timing (within 24 hours)
   - Matches by reference code (if provided)

3. **Confirmation tracking**:
   - Waits for minimum confirmations (12 blocks)
   - Updates confirmation count in real-time

4. **Balance crediting**:
   - Credits user balance after confirmation
   - Creates transaction record
   - Updates deposit intent status

### 3. Recovery Mechanism

The system tracks the last processed block for each network:

```sql
SELECT * FROM block_tracker;
```

If the service restarts, it resumes from the last processed block, ensuring no transactions are missed.

## API Usage Examples

### Create Deposit Intent

```javascript
const response = await fetch('/api/deposits/create-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer user_token'
  },
  body: JSON.stringify({
    network: 'TRC20',
    amount_usdt: 100
  })
});

const data = await response.json();
console.log('Reference Code:', data.deposit_intent.reference_code);
```

### Get User Deposits

```javascript
const response = await fetch('/api/user/user_id/deposits?limit=20&offset=0');
const data = await response.json();

console.log('Deposits:', data.data.deposits);
console.log('Summary:', data.data.summary);
```

### Get User Balance

```javascript
const response = await fetch('/api/user/user_id/balance');
const data = await response.json();

console.log('Available Balance:', data.data.balance.available_usdt);
console.log('Pending Deposits:', data.data.pending_deposits);
```

## Monitoring and Maintenance

### 1. Service Health Check

Check if the standalone service is running:

```bash
pm2 status deposit-listener
```

### 2. Log Monitoring

View real-time logs:

```bash
pm2 logs deposit-listener --lines 100
```

### 3. Database Monitoring

Check recent activity:

```sql
-- Recent deposit transactions
SELECT * FROM event_deposit_transactions 
ORDER BY detected_at DESC LIMIT 10;

-- Block tracker status
SELECT 
  network,
  last_processed_block,
  updated_at
FROM block_tracker;

-- Pending deposit intents
SELECT COUNT(*) as pending_intents
FROM deposit_intents 
WHERE status = 'pending' AND expires_at > now();
```

### 4. Performance Metrics

Monitor key metrics:

```sql
-- Deposits by status
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount_usdt) as total_amount
FROM event_deposit_transactions 
GROUP BY status;

-- Processing time analysis
SELECT 
  network,
  AVG(EXTRACT(EPOCH FROM (confirmed_at - detected_at))/60) as avg_confirmation_minutes
FROM event_deposit_transactions 
WHERE confirmed_at IS NOT NULL
GROUP BY network;
```

## Troubleshooting

### Common Issues

1. **No events detected**:
   - Check main wallet addresses are correct
   - Verify RPC endpoints are working
   - Check block tracker is updating

2. **Events detected but not matched**:
   - Check amount tolerance (±5%)
   - Verify deposit intent hasn't expired
   - Check reference code matching

3. **Service keeps restarting**:
   - Check environment variables
   - Verify Supabase connection
   - Check RPC endpoint limits

### Debug Commands

```bash
# Check service status
pm2 status

# View detailed logs
pm2 logs deposit-listener --lines 200

# Restart service
pm2 restart deposit-listener

# Check environment
pm2 env deposit-listener
```

## Security Considerations

1. **Main Wallet Security**:
   - Use hardware wallets for main wallet private keys
   - Implement multi-signature if possible
   - Regular security audits

2. **API Security**:
   - All endpoints use proper authentication
   - Row Level Security (RLS) enabled
   - Input validation on all endpoints

3. **Service Security**:
   - Run service with limited privileges
   - Use environment variables for secrets
   - Regular dependency updates

## Migration from Sub-Wallet System

### 1. Gradual Migration

1. **Deploy new system** alongside existing system
2. **Test with small amounts** first
3. **Gradually redirect new users** to event-based system
4. **Monitor both systems** during transition
5. **Deprecate sub-wallet system** after validation

### 2. Data Migration

Existing deposit data can be preserved:

```sql
-- Migrate existing deposit data (optional)
INSERT INTO event_deposit_transactions (
  user_id, tx_hash, amount_usdt, network, status, detected_at
)
SELECT 
  user_id, 
  tx_hash, 
  amount, 
  CASE 
    WHEN network = 'TRON' THEN 'TRC20'
    WHEN network = 'ARBITRUM' THEN 'BEP20'
  END,
  'credited',
  detected_at
FROM deposit_transactions 
WHERE status = 'credited';
```

## Cost Analysis

### Old System Costs (Per Month)
- **Gas for 1000 users**: ~$500-1000 (TRX + ETH)
- **Infrastructure complexity**: High
- **Maintenance overhead**: High

### New System Costs (Per Month)
- **Gas costs**: $0 (no sub-wallets)
- **RPC calls**: ~$10-50 (depending on volume)
- **Infrastructure**: Minimal
- **Maintenance**: Low

**Estimated savings**: 90-95% reduction in operational costs

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review logs for error messages
3. Verify configuration settings
4. Test with small amounts first

## Conclusion

The event-based deposit system provides a more efficient, cost-effective, and scalable solution for handling cryptocurrency deposits. It eliminates the complexity and costs associated with sub-wallet management while providing better reliability and user experience.
