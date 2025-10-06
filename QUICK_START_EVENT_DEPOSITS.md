# Quick Start: Event-Based Deposit System

## 🚀 Get Started in 15 Minutes

This guide will get your new event-based deposit system running quickly.

## Prerequisites

- ✅ Existing EarningWe platform with Supabase
- ✅ TRON and BSC main wallet addresses
- ✅ Access to Supabase SQL Editor

## Step 1: Database Setup (5 minutes)

### 1.1 Run Migration Script

Copy and paste this into your Supabase SQL Editor:

```sql
-- Event-Based Deposit System Migration
-- This script creates the new event-based deposit system that replaces sub-wallets with main wallet event tracking

-- 1. Create deposit intents table (for tracking user deposit requests)
CREATE TABLE IF NOT EXISTS public.deposit_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  network varchar(20) NOT NULL CHECK (network IN ('TRC20', 'BEP20')),
  amount_usdt numeric(12,2) NOT NULL CHECK (amount_usdt > 0),
  reference_code varchar(50) NOT NULL UNIQUE,
  main_wallet_address varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'detected', 'confirmed', 'credited', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create event-based deposit transactions table
CREATE TABLE IF NOT EXISTS public.event_deposit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  deposit_intent_id uuid REFERENCES public.deposit_intents(id) ON DELETE SET NULL,
  tx_hash varchar(255) NOT NULL UNIQUE,
  from_address varchar(255) NOT NULL,
  to_address varchar(255) NOT NULL,
  amount_usdt numeric(12,2) NOT NULL CHECK (amount_usdt > 0),
  network varchar(20) NOT NULL CHECK (network IN ('TRC20', 'BEP20')),
  block_number bigint NOT NULL,
  block_hash varchar(255),
  confirmations integer DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'credited', 'failed')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  credited_at timestamptz,
  reference_code varchar(50),
  raw_transaction_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create block tracking table
CREATE TABLE IF NOT EXISTS public.block_tracker (
  id SERIAL PRIMARY KEY,
  network varchar(20) NOT NULL UNIQUE CHECK (network IN ('TRC20', 'BEP20')),
  last_processed_block bigint NOT NULL DEFAULT 0,
  contract_address varchar(255) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create main wallet configuration table
CREATE TABLE IF NOT EXISTS public.main_wallets (
  id SERIAL PRIMARY KEY,
  network varchar(20) NOT NULL UNIQUE CHECK (network IN ('TRC20', 'BEP20')),
  address varchar(255) NOT NULL UNIQUE,
  contract_address varchar(255) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  min_confirmations integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.main_wallets ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for quick start)
CREATE POLICY "Users can manage own deposit intents" ON public.deposit_intents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own deposit transactions" ON public.event_deposit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read main wallets" ON public.main_wallets FOR SELECT USING (is_active = true);

-- Create helper function
CREATE OR REPLACE FUNCTION generate_deposit_reference_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT COUNT(*) INTO exists_check FROM public.deposit_intents WHERE reference_code = code;
    IF exists_check = 0 THEN RETURN code; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_deposit_reference_code() TO authenticated;
```

### 1.2 Configure Main Wallets

**Replace with your actual wallet addresses:**

```sql
-- Insert your main wallet configurations
INSERT INTO public.main_wallets (network, address, contract_address, min_confirmations) VALUES
  ('TRC20', 'YOUR_TRON_MAIN_WALLET_ADDRESS', 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj', 12),
  ('BEP20', 'YOUR_BSC_MAIN_WALLET_ADDRESS', '0x55d398326f99059fF775485246999027B3197955', 12)
ON CONFLICT (network) DO UPDATE SET
  address = EXCLUDED.address,
  contract_address = EXCLUDED.contract_address;

-- Initialize block tracker
INSERT INTO public.block_tracker (network, last_processed_block, contract_address) VALUES
  ('TRC20', 0, 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'),
  ('BEP20', 0, '0x55d398326f99059fF775485246999027B3197955')
ON CONFLICT (network) DO NOTHING;
```

## Step 2: Deploy Event Listener (5 minutes)

### Option A: Cron Job (Easiest)

Add this to your cron-job.org:

```
URL: https://your-domain.com/api/cron/event-deposit-listener
Method: GET
Headers: Authorization: Bearer YOUR_CRON_SECRET
Schedule: */30 * * * * * (every 30 seconds)
```

### Option B: Standalone Service (Recommended)

```bash
cd services
npm install
cp env.example .env
# Edit .env with your Supabase credentials
npm run pm2:start
```

## Step 3: Test the System (5 minutes)

### 3.1 Create Test Deposit Intent

```bash
curl -X POST https://your-domain.com/api/deposits/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "network": "TRC20",
    "amount_usdt": 1
  }'
```

Response:
```json
{
  "success": true,
  "deposit_intent": {
    "reference_code": "A1B2C3D4",
    "main_wallet_address": "TYour...Address",
    "amount_usdt": 1,
    "expires_at": "2024-01-02T12:00:00Z"
  }
}
```

### 3.2 Send Test Deposit

1. **Send 1 USDT** to the main wallet address
2. **Wait 30-60 seconds** for detection
3. **Check deposit status**:

```bash
curl https://your-domain.com/api/user/USER_ID/deposits
```

## Environment Variables

Add to your `.env.local`:

```env
# Required for BSC monitoring
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Optional: Adjust monitoring interval
LISTENER_INTERVAL_MS=30000
```

## Monitoring

### Check System Status

```sql
-- Recent deposits
SELECT * FROM event_deposit_transactions 
ORDER BY detected_at DESC LIMIT 5;

-- Block tracker status
SELECT * FROM block_tracker;

-- Pending intents
SELECT COUNT(*) FROM deposit_intents 
WHERE status = 'pending' AND expires_at > now();
```

### View Logs

**Cron job**: Check your cron-job.org execution logs

**Standalone service**:
```bash
pm2 logs deposit-listener
```

## Frontend Integration

### Create Deposit Intent

```typescript
const createDeposit = async (network: 'TRC20' | 'BEP20', amount: number) => {
  const response = await fetch('/api/deposits/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      network,
      amount_usdt: amount
    })
  });
  
  const data = await response.json();
  return data.deposit_intent;
};
```

### Display Deposit Instructions

```typescript
const DepositInstructions = ({ intent }) => (
  <div className="deposit-instructions">
    <h3>Send USDT to complete your deposit</h3>
    <div className="wallet-info">
      <p><strong>Network:</strong> {intent.network}</p>
      <p><strong>Address:</strong> {intent.main_wallet_address}</p>
      <p><strong>Amount:</strong> {intent.amount_usdt} USDT</p>
      <p><strong>Reference:</strong> {intent.reference_code}</p>
    </div>
    <div className="instructions">
      <p>1. Send exactly {intent.amount_usdt} USDT to the address above</p>
      <p>2. Your deposit will be automatically detected and credited</p>
      <p>3. This request expires in 24 hours</p>
    </div>
  </div>
);
```

## Troubleshooting

### Common Issues

**❌ Deposits not detected**
- Check main wallet addresses are correct
- Verify event listener is running
- Check block tracker is updating

**❌ Service won't start**
- Verify environment variables
- Check Supabase connection
- Review error logs

**❌ Deposits detected but not credited**
- Check confirmation requirements (12 blocks)
- Verify amount matching (±5% tolerance)
- Check deposit intent hasn't expired

### Quick Fixes

```bash
# Restart service
pm2 restart deposit-listener

# Check service status
pm2 status

# View recent logs
pm2 logs deposit-listener --lines 50
```

## Success Indicators

✅ **System is working when:**
- Block tracker updates every 30 seconds
- Test deposits are detected within 2 minutes
- Deposits are credited after 12 confirmations
- No error logs in the past hour

## Next Steps

1. **Monitor for 24 hours** with test deposits
2. **Gradually migrate users** from sub-wallet system
3. **Set up alerts** for system health
4. **Update user documentation**

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the full documentation in `EVENT_BASED_DEPOSIT_SYSTEM.md`
3. Check logs for specific error messages
4. Test with small amounts first

## Cost Savings

**Before**: $500-1000/month (sub-wallet gas costs)
**After**: $10-50/month (RPC costs only)
**Savings**: 90-95% reduction 🎉

---

**🎯 You're now running a more efficient, cost-effective deposit system!**
