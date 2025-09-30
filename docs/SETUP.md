# EarningWe — Setup and Deployment Guide

This document explains how to configure, run, test, and deploy the EarningWe web app end-to-end.

## Prerequisites
- Node.js 18+ (Next.js 15 requires Node 18 or newer)
- A Supabase project (Database + Auth)
- A NOWPayments account (TRC20 USDT)
- A Vercel account (recommended for deployment)

## 1) Environment variables
Copy `docs/env.example.txt` to `.env.local` and fill values:

Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_SITE_URL` (e.g. http://localhost:3000 for dev; production URL on Vercel)
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `REVALIDATE_SECRET` (used for cron)

Optional
- `NEXT_PUBLIC_NOWPAYMENTS_CURRENCY` (default `USDTTRC20`)
- `NOWPAYMENTS_BASE_URL` (default `https://api.nowpayments.io/v1`)

## 2) Supabase schema
Open Supabase > SQL Editor, paste the contents of `db/schema.sql`, and run it. This creates:
- `profiles`, `plans`, `subscriptions`, `deposits`, `withdrawals`, `transactions`, `balances`
- RLS policies for secure access
- `admin_overview` view for service-role admin metrics

Tip: Make your own account an admin by setting the `role` metadata to `admin` in Supabase Auth (app_metadata or user_metadata).

## 3) Run the app locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## 4) NOWPayments configuration
- Set your IPN/Webhook URL to: `https://YOUR_DOMAIN/api/nowpayments/webhook`
- Currency: TRC20 USDT (`USDTTRC20`)
- The webhook uses header `x-nowpayments-sig` with HMAC-SHA512 over the canonical JSON body using `NOWPAYMENTS_IPN_SECRET`.

Local test (simulate webhook):
```bash
# Compute HMAC of the body with NOWPAYMENTS_IPN_SECRET, set as x-nowpayments-sig
curl -X POST http://localhost:3000/api/nowpayments/webhook \
  -H "Content-Type: application/json" \
  -H "x-nowpayments-sig: <hex-hmac>" \
  -d '{"order_id":"dep_1738240000000","payment_status":"confirmed","payment_id":"abc123"}'
```

## 5) Daily earnings cron
Endpoint: `GET /api/cron/daily-returns`

Auth options
- Header: `Authorization: Bearer <REVALIDATE_SECRET>`
- Or query: `?token=<REVALIDATE_SECRET>` (useful for Vercel Cron)

Vercel Cron example
- In Vercel Project Settings > Cron Jobs, create a daily job:
  - Path: `/api/cron/daily-returns?token=YOUR_SECRET`
  - Schedule: `0 3 * * *` (3AM UTC)

## 6) Deployment on Vercel
- Create a new Vercel project linked to your Git repo
- Set Environment Variables from `.env.local` (use Production/Preview as needed)
- Deploy — the site will be available at your Vercel domain
- Add the Cron Job and NOWPayments Webhook URL (your production URL)

## 7) Admin usage
- Admin Dashboard at `/admin` (requires `role=admin`)
- View totals and pending withdrawals
- Approve a withdrawal in-place (calls `/api/admin/withdrawals/approve`)

## 8) User flows
- Sign up (`/signup`) / Log in (`/login`)
- Choose a plan (`/plans`) which pre-fills deposit amount
- Deposit (`/wallet/deposit`) — creates NOWPayments invoice
- After payment confirmed (webhook), a `deposit` transaction is recorded and balance updated
- If `planId` was included, a `subscription` is created automatically
- Daily cron credits `earning` transactions and updates balances
- Withdraw (`/wallet/withdraw`) — creates a `withdrawals` record (pending)
- Admin approves withdrawal — records a `withdrawal` transaction and reduces balance

## 9) Security notes
- Service role key is only used server-side (cron/webhook/admin). Never expose it in the client.
- RLS ensures users only see their own data.
- Webhook is idempotent and signature-verified.
- Cron is protected by a shared secret.

## 10) Troubleshooting
- 401 at protected pages: ensure login and middleware config
- 401 at cron: check `REVALIDATE_SECRET` header or token
- Webhook failing: verify `x-nowpayments-sig` HMAC and `NOWPAYMENTS_IPN_SECRET`
- DB errors on insert: ensure `profiles` exists (API upserts it) and schema was applied

## 11) Extending
- Add email notifications (Supabase Functions/Edge functions or 3rd-party)
- Add referrals table and UI
- Add 2FA with OTP apps or email
- Improve charts with real aggregates and ranges

You’re all set. If you need help automating deployment or adding more features, open an issue in the repo or contact the maintainer.
