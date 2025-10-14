# WeEarn Platform - Production Launch Checklist

## 🚨 CRITICAL: Pre-Launch Database Reset

### 1. Database Reset Process
- [ ] **Backup current database** (if needed for reference)
- [ ] **Execute production reset**: `POST /api/admin/production-reset`
  ```json
  {
    "confirm": "RESET_FOR_PRODUCTION"
  }
  ```
- [ ] **Verify reset completed successfully**
- [ ] **Check all tables are empty** (except investment_plans and admin_users)
- [ ] **Confirm 5 investment plans are active**
- [ ] **Test admin login**: `admin / WeEarn2024!`

### 2. Security Hardening
- [ ] **Change admin password immediately** after first login
- [ ] **Disable debug endpoints** (see section below)
- [ ] **Remove test API keys** from environment variables
- [ ] **Enable production logging**
- [ ] **Verify RLS policies are active**
- [ ] **Check CORS settings for production domain**

### 3. Environment Configuration
- [ ] **Set production environment variables**:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_SUPABASE_URL` (production)
  - `SUPABASE_SERVICE_ROLE_KEY` (production)
  - `NOWPAYMENTS_API_KEY` (production)
  - `NOWPAYMENTS_IPN_SECRET` (production)
- [ ] **Update allowed domains in Supabase**
- [ ] **Configure production database connection**
- [ ] **Set up SSL certificates**

### 4. Debug Endpoints to Disable/Remove

#### 🔴 CRITICAL - Remove These Endpoints:
```
/api/debug/master-debug-dashboard
/api/debug/comprehensive-website-check
/api/debug/investigate-auto-plans
/api/debug/fix-earnings-issues
/api/debug/check-automation-sources
/api/debug/check-transactions
/api/debug/fix-missing-principal-unlocks
/api/debug/trigger-earnings-check
/api/debug/test-investment-completion
/api/debug/referral-display-test
/api/debug/force-referral-update
/api/debug/check-referral-data
/api/debug/test-referral-display
/debug (debug dashboard page)
```

#### ⚠️ Keep for Monitoring (Secure with Admin Auth):
```
/api/admin/production-reset (remove after launch)
/api/user/check-earnings (keep - needed for earnings processing)
```

### 5. System Testing with Clean Database
- [ ] **User registration flow**
- [ ] **Referral system**
- [ ] **Investment plan purchase**
- [ ] **Earnings processing**
- [ ] **Withdrawal requests**
- [ ] **Admin panel functionality**
- [ ] **Transaction logging**
- [ ] **Balance calculations**

### 6. Payment System Verification
- [ ] **NOWPayments integration** (production API)
- [ ] **Test small deposit** ($10-20)
- [ ] **Verify webhook handling**
- [ ] **Check transaction confirmation**
- [ ] **Test withdrawal processing**

### 7. Performance & Monitoring
- [ ] **Set up error monitoring** (Sentry/LogRocket)
- [ ] **Configure performance monitoring**
- [ ] **Set up database monitoring**
- [ ] **Enable API rate limiting**
- [ ] **Configure backup schedules**

### 8. Legal & Compliance
- [ ] **Terms of Service** updated
- [ ] **Privacy Policy** updated
- [ ] **Risk disclaimers** in place
- [ ] **KYC/AML procedures** (if required)
- [ ] **Jurisdiction compliance** verified

### 9. User Communication
- [ ] **Launch announcement** prepared
- [ ] **User guide/FAQ** updated
- [ ] **Support channels** ready
- [ ] **Social media** accounts ready
- [ ] **Marketing materials** finalized

### 10. Post-Launch Monitoring
- [ ] **Monitor user registrations**
- [ ] **Watch for system errors**
- [ ] **Check earnings processing**
- [ ] **Monitor withdrawal requests**
- [ ] **Track referral activity**
- [ ] **Review transaction logs**

## 🎯 Current System Status

Based on previous debugging and fixes:

### ✅ RESOLVED ISSUES:
- **Earnings processing bug** - Fixed (investments now pay correct earnings)
- **Admin panel display** - Fixed (shows real data, mobile responsive)
- **Transaction logging** - Fixed (principal unlocks now recorded)
- **Referral system** - Fixed (correct counts and commission display)
- **Security audit** - Completed (no unauthorized activity found)

### 📊 Investment Plans Ready:
1. **Daily Plan**: $50-$100K, 2% daily ROI, 1 day
2. **3-Day Plan**: $100-$100K, 2.3% daily ROI, 3 days  
3. **10-Day Plan**: $200-$100K, 2.6% daily ROI, 10 days
4. **Monthly Plan**: $100-$100K, 120% total ROI, 30 days (end payout)
5. **Bi-Monthly Plan**: $100-$100K, 150% total ROI, 60 days (end payout)

### 🔐 Admin Access:
- **Username**: `admin`
- **Password**: `WeEarn2024!` (CHANGE IMMEDIATELY)
- **Role**: `super_admin`
- **Permissions**: Full system access

## 🚀 Launch Command Sequence

1. **Execute database reset**:
   ```bash
   curl -X POST https://your-domain.com/api/admin/production-reset \
   -H "Content-Type: application/json" \
   -d '{"confirm": "RESET_FOR_PRODUCTION"}'
   ```

2. **Verify reset success**:
   ```bash
   curl https://your-domain.com/api/admin/production-reset
   ```

3. **Test admin login**:
   - Go to `/admin`
   - Login with `admin / WeEarn2024!`
   - **IMMEDIATELY change password**

4. **Remove debug endpoints** (delete files or add auth checks)

5. **Test core functionality** with real small amounts

6. **Go live** 🎉

## ⚠️ IMPORTANT WARNINGS

- **All test data will be permanently deleted**
- **Change admin password immediately after reset**
- **Test with small amounts first**
- **Monitor system closely for first 24-48 hours**
- **Have rollback plan ready**
- **Keep debug tools accessible to admin only**

---

**Ready for launch when all checkboxes are completed! 🚀**
