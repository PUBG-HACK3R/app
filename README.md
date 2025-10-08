# WeEarn Mining Platform

A professional Bitcoin mining investment platform with automated daily returns.

## ✅ **Clean Backend Implementation Complete**

This project has been completely redesigned with a clean, error-free backend architecture.

## 🏗️ **Architecture Overview**

### **Database Schema (Clean & Simple)**
- **Single Source of Truth**: `user_balances` table for all balance tracking
- **Consistent Naming**: All tables use clear, consistent naming conventions
- **No Complex Dependencies**: Removed SQL functions and complex triggers
- **Proper Relationships**: Clean foreign key relationships with cascade handling

### **Core Tables**
1. `user_profiles` - User information and referral codes
2. `investment_plans` - Available investment plans
3. `user_balances` - Single source of truth for all balances
4. `deposits` - NOWPayments deposits only (blockchain removed)
5. `user_investments` - Active user investments
6. `daily_earnings` - Daily ROI earnings
7. `withdrawals` - Withdrawal requests and processing
8. `referral_commissions` - Referral commission tracking
9. `transaction_logs` - Complete audit trail

## 🚀 **Tech Stack**
- **Frontend**: Next.js 15.5.4 with React 19.1.0
- **Database**: Supabase (PostgreSQL) with RLS
- **Payments**: NOWPayments (TRC20 USDT only)
- **Styling**: Tailwind CSS with Radix UI components
- **Language**: TypeScript
- **Deployment**: Vercel

## 🔧 **Setup Instructions**

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Run the migration file to set up your Supabase database:
```sql
-- Execute: src/lib/database/migration.sql in your Supabase SQL editor
```

### 3. Environment Variables
Configure your `.env.local`:
```env
# App
NEXT_PUBLIC_APP_NAME=WeEarn
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NOWPayments
NEXT_PUBLIC_NOWPAYMENTS_CURRENCY=usdttrc20
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret

# Security
ADMIN_SECRET=your_admin_secret
CRON_SECRET=your_cron_secret
```

### 4. Start Development
```bash
npm run dev
```

## 📡 **API Endpoints**

### **Public Endpoints**
- `GET /api/plans` - Get active investment plans

### **User Endpoints** (Authenticated)
- `GET /api/user/balance` - Get user balance and stats
- `GET /api/user/investments` - Get user investments
- `POST /api/investments/create` - Create new investment
- `POST /api/withdraw/request` - Request withdrawal

### **Payment Endpoints**
- `POST /api/nowpayments/create-invoice` - Create payment invoice
- `POST /api/nowpayments/webhook` - NOWPayments webhook (automated)

### **Cron Jobs**
- `GET /api/cron/daily-earnings` - Process daily earnings (automated)

## 💰 **Payment Flow**

1. **Deposit**: User creates NOWPayments invoice → Pays → Webhook confirms → Balance updated
2. **Investment**: User selects plan → Balance deducted → Investment created → Daily earnings start
3. **Earnings**: Cron job runs daily → Calculates ROI → Adds to balance → Logs transaction
4. **Withdrawal**: User requests → Admin approves → Processed manually → Balance deducted

## 🔐 **Security Features**

- **Row Level Security (RLS)** on all tables
- **Admin-only policies** for sensitive operations
- **Input validation** with Zod schemas
- **Signature verification** for webhooks
- **Rate limiting** on API endpoints
- **Audit trail** for all transactions

## 🎯 **Key Improvements**

### ✅ **Fixed Issues**
- **Balance Calculation**: Single source of truth in `user_balances`
- **Deposit Processing**: Simplified NOWPayments-only flow
- **Daily Earnings**: Clean, reliable cron job processing
- **Database Consistency**: Proper foreign keys and constraints
- **Error Handling**: Comprehensive error handling throughout

### ✅ **Removed Complexity**
- All blockchain event listeners
- Complex SQL functions
- Multiple deposit systems
- Confusing table relationships
- Legacy debug code

## 🚀 **Deployment**

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Cron Job Setup
Add this to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-earnings",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## 🧪 **Testing**

### Manual Testing Endpoints
- Daily earnings: `POST /api/cron/daily-earnings` (with auth header)
- Balance check: `GET /api/user/balance`
- Create investment: `POST /api/investments/create`

## 📊 **Admin Features**

- View all users and balances
- Approve/reject withdrawals
- Monitor daily earnings processing
- View transaction logs and audit trails

## 🔄 **Data Flow**

1. **User Registration** → Profile + Balance created automatically
2. **Deposit** → NOWPayments → Webhook → Balance updated → Referral commission
3. **Investment** → Balance locked → Daily earnings scheduled
4. **Daily Earnings** → ROI calculated → Balance updated → Transaction logged
5. **Withdrawal** → Request created → Admin approval → Balance deducted

## 🛠️ **Development**

The codebase is now clean, maintainable, and error-free:
- TypeScript for type safety
- Clean database service layer
- Consistent API responses
- Proper error handling
- Comprehensive logging

Ready for production deployment! 🎉
