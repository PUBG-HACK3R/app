# Daily Earnings Automation Setup Guide

## 🚀 Option 1: Vercel Cron Job (Recommended)

### ✅ Already Configured:
- `vercel.json` - Cron job runs daily at midnight UTC
- `/api/cron/daily-earnings` - Endpoint that processes earnings

### 🔧 Setup Steps:

1. **Add Environment Variable**
   ```
   CRON_SECRET=your-secret-key-here-make-it-random
   ```

2. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Add daily earnings cron job"
   git push
   ```

3. **Verify in Vercel Dashboard**
   - Go to your project settings
   - Check "Functions" tab
   - Should see cron job listed

---

## 🆓 Option 2: Free External Cron Services

### **cron-job.org (Free)**
- **URL**: https://cron-job.org
- **Setup**: 
  1. Create free account
  2. Add job: `https://your-app.vercel.app/api/admin/process-earnings`
  3. Schedule: `0 0 * * *` (daily at midnight)
  4. Add header: `Authorization: Bearer your-admin-token`

### **EasyCron (Free)**
- **URL**: https://www.easycron.com
- **Free tier**: 20 jobs
- **Same setup** as above

### **Cronhooks (Free)**
- **URL**: https://cronhooks.io
- **Free tier**: 5 jobs
- **Simple webhook** setup

---

## 🛠️ Option 3: Manual Testing

### **Test the Cron Job:**
```bash
curl -X GET "https://your-app.vercel.app/api/cron/daily-earnings" \
  -H "Authorization: Bearer your-cron-secret"
```

### **Test Admin Endpoint:**
```bash
curl -X POST "https://your-app.vercel.app/api/admin/process-earnings" \
  -H "Authorization: Bearer your-admin-token"
```

---

## 📊 How It Works

### **Daily Process (Automatic):**
1. **Midnight UTC** - Cron job triggers
2. **Find active subscriptions** - All users with active mining plans
3. **Calculate daily profits** - Based on plan ROI percentage
4. **Pay referral commissions** - 5% of daily profits to referrers
5. **Update balances** - Add earnings to user accounts
6. **Create transactions** - Record all payments

### **Example:**
- User A refers User B
- User B has $100 plan (2.2% daily)
- **Every day:**
  - User B gets $2.20 mining profit
  - User A gets $0.11 referral commission (5% of $2.20)
  - Both amounts added to their balances

---

## 🔍 Monitoring

### **Check Logs:**
- Vercel Dashboard → Functions → View logs
- Look for "Daily earnings processed successfully"

### **Manual Trigger (Admin Only):**
- Go to `/admin` panel
- Look for "Process Daily Earnings" button
- Click to manually run the process

---

## 💡 Pro Tips

### **Vercel Free Limits:**
- ✅ **2 cron jobs** - We're using 1
- ✅ **100GB bandwidth** - More than enough
- ✅ **Unlimited functions** - No problem

### **If You Need More Cron Jobs:**
1. **Combine functions** - One cron job can do multiple tasks
2. **Use external services** - cron-job.org, EasyCron
3. **Upgrade to Pro** - $20/month for unlimited crons

### **Backup Strategy:**
- Set up **both Vercel cron + external service**
- If one fails, the other continues
- External service calls your API endpoint

---

## 🚨 Important Notes

### **Environment Variables Needed:**
```
CRON_SECRET=your-random-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Security:**
- Cron endpoint requires secret key
- Admin endpoint requires admin authentication
- All database operations use service role

### **Testing:**
- Test locally first: `npm run dev`
- Test on staging before production
- Monitor logs for first few days
