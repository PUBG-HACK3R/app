# Migration Guide: Sub-Wallet to Event-Based Deposit System

## Overview

This guide walks you through migrating from your current sub-wallet deposit system to the new event-based system. The migration can be done gradually with zero downtime.

## Pre-Migration Checklist

- [ ] Backup your current database
- [ ] Test the new system on a staging environment
- [ ] Prepare your main wallet addresses
- [ ] Set up monitoring and alerting
- [ ] Plan rollback strategy

## Migration Steps

### Phase 1: Setup and Testing (1-2 days)

#### 1.1 Deploy Database Schema

```bash
# Run the migration script in Supabase SQL Editor
cat scripts/event-based-deposit-system.sql
```

#### 1.2 Configure Main Wallets

Update the main wallet addresses in your database:

```sql
-- Replace with your actual main wallet addresses
UPDATE public.main_wallets SET 
  address = 'TYourActualTronMainWalletAddress'
WHERE network = 'TRC20';

UPDATE public.main_wallets SET 
  address = '0xYourActualBscMainWalletAddress'
WHERE network = 'BEP20';
```

#### 1.3 Deploy Event Listener Service

**Option A: As a cron job (easiest)**
```bash
# Add to your existing cron-job.org setup
URL: https://your-domain.com/api/cron/event-deposit-listener
Schedule: */30 * * * * * (every 30 seconds)
```

**Option B: As standalone service (recommended)**
```bash
cd services
npm install
cp env.example .env
# Edit .env with your configuration
npm run pm2:start
```

#### 1.4 Test with Small Amounts

1. Create a test deposit intent:
```bash
curl -X POST https://your-domain.com/api/deposits/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{"network": "TRC20", "amount_usdt": 1}'
```

2. Send 1 USDT to the main wallet address
3. Monitor the event listener logs
4. Verify the deposit is detected and credited

### Phase 2: Parallel Operation (1 week)

#### 2.1 Update Frontend

Create a new deposit page that uses the event-based system:

```typescript
// Example: New deposit component
const EventBasedDeposit = () => {
  const [intent, setIntent] = useState(null);
  
  const createIntent = async (network: string, amount: number) => {
    const response = await fetch('/api/deposits/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network, amount_usdt: amount })
    });
    const data = await response.json();
    setIntent(data.deposit_intent);
  };
  
  return (
    <div>
      {intent ? (
        <div>
          <h3>Send USDT to:</h3>
          <p>Address: {intent.main_wallet_address}</p>
          <p>Amount: {intent.amount_usdt} USDT</p>
          <p>Reference: {intent.reference_code}</p>
        </div>
      ) : (
        <button onClick={() => createIntent('TRC20', 100)}>
          Create Deposit
        </button>
      )}
    </div>
  );
};
```

#### 2.2 A/B Test

- Route 50% of new users to the event-based system
- Route 50% to the existing sub-wallet system
- Monitor performance and user experience

#### 2.3 Monitor Both Systems

Set up monitoring dashboards:

```sql
-- Daily monitoring query
SELECT 
  'sub_wallet' as system,
  COUNT(*) as deposits,
  SUM(amount) as total_amount
FROM deposit_transactions 
WHERE DATE(created_at) = CURRENT_DATE

UNION ALL

SELECT 
  'event_based' as system,
  COUNT(*) as deposits,
  SUM(amount_usdt) as total_amount
FROM event_deposit_transactions 
WHERE DATE(detected_at) = CURRENT_DATE;
```

### Phase 3: Full Migration (1-2 weeks)

#### 3.1 Migrate All New Users

Update your deposit flow to use only the event-based system:

```typescript
// Update your existing deposit route
export async function GET(request: Request) {
  // Redirect all users to event-based system
  return NextResponse.redirect('/deposits/event-based');
}
```

#### 3.2 Handle Existing Sub-Wallets

For users with existing sub-wallet balances:

```sql
-- Find users with sub-wallet balances
SELECT 
  da.user_id,
  da.address,
  da.balance_usdt,
  da.network
FROM deposit_addresses da
WHERE da.balance_usdt > 0
  AND da.is_active = true;
```

**Option A: Auto-forward remaining balances**
- Keep the existing forwarding system running
- Let it naturally drain existing balances

**Option B: Manual migration**
- Notify users to withdraw remaining balances
- Provide a migration tool

#### 3.3 Update User Interface

Replace all sub-wallet deposit interfaces:

```typescript
// Remove old deposit address generation
// Replace with event-based deposit intents

const DepositPage = () => {
  return (
    <div>
      <h2>Deposit USDT</h2>
      <EventBasedDepositForm />
      {/* Remove: <SubWalletDepositForm /> */}
    </div>
  );
};
```

### Phase 4: Cleanup (1 week)

#### 4.1 Disable Sub-Wallet Generation

```typescript
// Disable sub-wallet creation
export async function GET(request: Request) {
  return NextResponse.json({ 
    error: 'Sub-wallet system has been deprecated. Please use the new deposit system.' 
  }, { status: 410 });
}
```

#### 4.2 Archive Old Data

```sql
-- Create archive table
CREATE TABLE deposit_addresses_archive AS 
SELECT * FROM deposit_addresses;

-- Create archive table for transactions
CREATE TABLE deposit_transactions_archive AS 
SELECT * FROM deposit_transactions;
```

#### 4.3 Remove Old Cron Jobs

- Disable old deposit detection cron jobs
- Disable old forwarding cron jobs
- Keep monitoring for a few more weeks

#### 4.4 Clean Up Code

Remove old files:
- `src/app/api/wallet/deposit-address/route.ts`
- `src/app/api/cron/detect-deposits/route.ts`
- `src/app/api/cron/auto-forward-deposits/route.ts`

## Rollback Plan

If issues arise, you can quickly rollback:

### Immediate Rollback (< 5 minutes)

1. **Disable event-based system**:
```sql
UPDATE main_wallets SET is_active = false;
```

2. **Re-enable sub-wallet system**:
```typescript
// Uncomment old deposit routes
// Re-enable old cron jobs
```

3. **Redirect users**:
```typescript
// Redirect to old deposit system
return NextResponse.redirect('/deposits/sub-wallet');
```

### Data Recovery

All data is preserved during migration:
- Old deposit data remains in original tables
- New deposit data is in separate tables
- No data loss during rollback

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Deposit Detection Rate**:
```sql
SELECT 
  DATE(detected_at) as date,
  COUNT(*) as deposits_detected
FROM event_deposit_transactions 
GROUP BY DATE(detected_at)
ORDER BY date DESC;
```

2. **Confirmation Times**:
```sql
SELECT 
  network,
  AVG(EXTRACT(EPOCH FROM (confirmed_at - detected_at))/60) as avg_minutes
FROM event_deposit_transactions 
WHERE confirmed_at IS NOT NULL
GROUP BY network;
```

3. **Failed Matches**:
```sql
SELECT COUNT(*) as unmatched_deposits
FROM event_deposit_transactions 
WHERE user_id IS NULL;
```

### Set Up Alerts

Create alerts for:
- Service downtime
- High unmatched deposit rate (>5%)
- Long confirmation times (>30 minutes)
- Block tracker not updating

## Cost Comparison

### Before Migration (Monthly)
- **Sub-wallet gas costs**: $500-1000
- **Infrastructure**: $100-200
- **Maintenance**: 20 hours/month
- **Total**: $1000-1500/month

### After Migration (Monthly)
- **RPC costs**: $10-50
- **Infrastructure**: $20-50
- **Maintenance**: 2 hours/month
- **Total**: $50-150/month

**Savings**: 85-95% reduction in costs

## Success Criteria

Migration is successful when:
- [ ] 99%+ deposit detection rate
- [ ] <5 minute average confirmation time
- [ ] Zero unmatched deposits for 48 hours
- [ ] All users successfully using new system
- [ ] Old system fully deprecated

## Post-Migration Tasks

1. **Update documentation**
2. **Train support team**
3. **Monitor for 30 days**
4. **Collect user feedback**
5. **Optimize performance**
6. **Plan next improvements**

## Support During Migration

### Common Issues and Solutions

**Issue**: Deposits not detected
- **Solution**: Check main wallet address configuration
- **Check**: Block tracker is updating

**Issue**: Long confirmation times
- **Solution**: Verify RPC endpoints are responsive
- **Check**: Network congestion status

**Issue**: Service keeps restarting
- **Solution**: Check environment variables
- **Check**: Memory usage and limits

### Emergency Contacts

- **Technical Lead**: [Your contact]
- **DevOps**: [Your contact]
- **Support Team**: [Your contact]

## Conclusion

This migration will significantly reduce costs and complexity while improving reliability. The gradual approach ensures minimal risk and allows for quick rollback if needed.

Follow this guide step by step, and don't hesitate to pause the migration if any issues arise. The old system will continue working throughout the migration process.
