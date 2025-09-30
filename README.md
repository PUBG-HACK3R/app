# 💰 WeEarn - Smart Investment Platform

A modern, secure investment platform built with Next.js 15, Supabase, and NOWPayments. Users can invest USDT and earn guaranteed daily returns with full transparency and admin oversight.

![WeEarn Platform](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-green) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-blue)

## ✨ Features

### 🔐 **Security First**
- **Supabase Authentication** with JWT tokens
- **Role-based access control** (User/Admin)
- **Row Level Security (RLS)** on all database tables
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas
- **HMAC signature verification** for webhooks

### 💳 **Payment System**
- **NOWPayments integration** for USDT TRC20 deposits
- **Automatic deposit confirmation** via webhooks
- **Manual withdrawal approval** by admins
- **Real-time balance updates**
- **Transaction history tracking**

### 📊 **Investment Plans**
- **Starter Plan**: $50 minimum, 1.0% daily ROI, 30 days
- **Pro Plan**: $200 minimum, 1.2% daily ROI, 45 days  
- **Elite Plan**: $500 minimum, 1.5% daily ROI, 60 days

### 🎯 **User Experience**
- **Professional landing page** with trust indicators
- **Real-time dashboard** with earnings charts
- **Mobile-responsive design** with hamburger menu
- **Dark/light mode** support
- **Loading states** and error boundaries
- **SEO optimized** with Open Graph tags

### ⚙️ **Admin Panel**
- **Real-time metrics** dashboard
- **Withdrawal approval** system
- **User management** capabilities
- **Transaction monitoring**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- NOWPayments account
- Vercel account (for deployment)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd earningwe
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env.local` and fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=WeEarn

# NOWPayments
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NEXT_PUBLIC_NOWPAYMENTS_CURRENCY=USDTTRC20

# Security
REVALIDATE_SECRET=your_random_secret
```

### 3. Database Setup
1. Create a new Supabase project
2. Run the SQL schema from `db/schema.sql` in Supabase SQL Editor
3. This creates all tables, RLS policies, and the admin overview view

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── dashboard/         # User dashboard
│   ├── plans/             # Investment plans
│   └── wallet/            # Wallet operations
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── charts/           # Chart components
│   ├── admin/            # Admin-specific components
│   └── loading/          # Loading skeletons
├── lib/                  # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── validations.ts    # Zod schemas
│   └── rate-limit.ts     # Rate limiting
└── docs/                 # Documentation
```

## 🔧 Configuration

### NOWPayments Setup
1. Create NOWPayments account
2. Set webhook URL: `https://yourdomain.com/api/nowpayments/webhook`
3. Enable TRC20 USDT payments
4. Copy API key and IPN secret to environment variables

### GitHub Actions (Free Cron Alternative)
1. Push code to GitHub
2. Add repository secrets:
   - `CRON_URL`: `https://yourdomain.com/api/cron/daily-returns`
   - `REVALIDATE_SECRET`: Same as your env variable
3. The workflow runs daily at 3 AM UTC

### Admin Account Setup
In Supabase Dashboard:
1. Go to Authentication > Users
2. Find your user account
3. Edit user metadata and add: `{"role": "admin"}`

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
Update these for production:
- `NEXT_PUBLIC_SITE_URL`: Your production domain
- `NOWPAYMENTS_WEBHOOK_URL`: Update in NOWPayments dashboard
- All other variables remain the same

## 📊 API Endpoints

### Public Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Protected Endpoints  
- `POST /api/nowpayments/create-invoice` - Create deposit invoice
- `POST /api/withdraw/request` - Request withdrawal
- `GET /api/cron/daily-returns` - Process daily earnings (cron)

### Admin Endpoints
- `POST /api/admin/withdrawals/approve` - Approve withdrawal
- `GET /admin` - Admin dashboard (UI)

### Webhooks
- `POST /api/nowpayments/webhook` - NOWPayments IPN handler

## 🔒 Security Features

### Rate Limiting
- **Auth endpoints**: 5 attempts per 15 minutes
- **API endpoints**: 30 requests per minute  
- **Admin endpoints**: 5 requests per minute

### Input Validation
All forms use Zod schemas for validation:
- Email format validation
- Password strength requirements
- Amount limits and sanitization
- Address format validation

### Database Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Admin operations use service role key
- Foreign key constraints prevent orphaned records

## 🎨 UI Components

Built with **shadcn/ui** and **Tailwind CSS v4**:
- Consistent design system
- Dark/light mode support
- Mobile-responsive components
- Loading states and error boundaries
- Professional fintech styling

## 📈 Monitoring & Logging

### Error Handling
- React Error Boundaries catch component errors
- API errors return structured JSON responses
- Client-side error logging to console
- Graceful fallbacks for failed operations

### Performance
- Loading skeletons for better perceived performance
- Optimized images and fonts
- Efficient database queries with proper indexing
- Client-side caching where appropriate

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Plan selection and deposit flow
- [ ] NOWPayments webhook processing
- [ ] Daily earnings cron job
- [ ] Withdrawal request and approval
- [ ] Admin dashboard metrics
- [ ] Mobile responsiveness
- [ ] Dark/light mode switching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [Setup Guide](docs/SETUP.md) for detailed instructions
- Review the [Environment Variables](docs/env.example.txt) template
- Open an issue for bugs or feature requests

## 🏗️ Built With

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Supabase](https://supabase.com/)** - Backend as a Service
- **[NOWPayments](https://nowpayments.io/)** - Cryptocurrency payments
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - UI component library
- **[Framer Motion](https://www.framer.com/motion/)** - Animations
- **[Recharts](https://recharts.org/)** - Charts and graphs
- **[Zod](https://zod.dev/)** - Schema validation
- **[Lucide React](https://lucide.dev/)** - Icon library

---

**WeEarn** - Smart investing made simple! 🚀
