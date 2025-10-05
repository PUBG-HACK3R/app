# WeEarn Mining Platform - Complete Architecture Analysis

## 🏗️ **PLATFORM OVERVIEW**

**WeEarn Mining** is a Next.js 15 fintech application focused on Bitcoin mining investments with the following core architecture:

### **Technology Stack:**
- **Frontend**: Next.js 15 + TypeScript + TailwindCSS v4
- **UI**: Radix UI + shadcn/ui components + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: NOWPayments integration
- **Crypto**: TRON + Arbitrum networks (dual network support)

---

## 📁 **DIRECTORY STRUCTURE ANALYSIS**

### **Core Application (`/src/app/`)**
```
├── layout.tsx                 # Root layout with theme + navigation
├── page.tsx                   # Landing page (Bitcoin mining theme)
├── globals.css                # Global styles + TailwindCSS

├── dashboard/                 # User dashboard
├── plans/                     # Investment plans (mining plans)
├── wallet/                    # Wallet operations (deposit/withdraw/history)
├── admin/                     # Admin panel (mining operations)
├── settings/                  # User profile settings
├── referrals/                 # Referral system
├── login/ + signup/           # Authentication

└── api/                       # API routes
    ├── auth/                  # Authentication endpoints
    ├── admin/                 # Admin management APIs
    ├── wallet/                # Wallet operations
    ├── nowpayments/           # Payment processing
    └── hotwallet-*/           # Hot wallet operations
```

### **Components (`/src/components/`)**
```
├── ui/                        # shadcn/ui base components
├── admin/                     # Admin-specific components
├── wallet/                    # Wallet-related components
├── conditional-header.tsx     # Smart header routing
├── conditional-bottom-nav.tsx # Mobile navigation
└── Various utility components
```

### **Libraries (`/src/lib/`)**
```
├── supabase/
│   ├── server.ts             # Server-side Supabase client
│   ├── client.ts             # Client-side Supabase client
│   └── admin.ts              # Admin Supabase client (service role)
├── validations.ts            # Zod schemas
└── utils.ts                  # Utility functions
```

---

## 🗄️ **DATABASE SCHEMA ANALYSIS**

### **Core Tables:**
1. **`profiles`** - User profiles with roles (user/admin)
2. **`plans`** - Mining investment plans with specifications
3. **`plan_categories`** - Mining categories (bitcoin, ethereum, etc.)
4. **`transactions`** - All financial transactions
5. **`subscriptions`** - User plan subscriptions
6. **`withdrawals`** - Withdrawal requests
7. **`deposits`** - Deposit tracking
8. **`referrals`** - Referral system

### **Mining-Specific Extensions:**
- **`mining_stats`** - Real-time mining performance
- **`mining_rewards`** - Detailed reward tracking
- **`mining_equipment`** - ASIC equipment management
- **`mining_pools`** - Mining pool configurations
- **`crypto_prices`** - Real-time price tracking

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Authentication Flow:**
1. **Supabase Auth** handles user registration/login
2. **Profiles table** stores additional user data + roles
3. **RLS (Row Level Security)** controls data access
4. **Admin role** checked via profiles table

### **Current Issues Identified:**
- **RLS Policy Conflicts** causing infinite recursion
- **Role checking inconsistency** between metadata vs database
- **Admin access blocked** due to policy issues

---

## 🔄 **API ARCHITECTURE**

### **Authentication Pattern:**
```typescript
// Standard pattern used across APIs
const supabase = await getSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();

// Role checking (INCONSISTENT - needs fixing)
const role = (user.app_metadata as any)?.role || "user";
```

### **Admin Operations:**
```typescript
// Admin operations use service role client
const admin = getSupabaseAdminClient();
```

---

## ⚠️ **IDENTIFIED ISSUES & PATTERNS**

### **1. Role Checking Inconsistency**
**Problem**: Different parts of the app check roles differently
- Some check `app_metadata.role`
- Some check `profiles.role` 
- Some have RLS conflicts

**Solution**: Standardize role checking with admin client bypass

### **2. Database Schema Conflicts**
**Problem**: Old schema vs new mining schema
- Old plans use `price_usdt`
- New plans use `min_amount`/`max_amount`
- Missing mining-specific columns

**Solution**: Complete schema migration needed

### **3. Component Dependencies**
**Problem**: Components reference non-existent UI components
- Missing `@/components/ui/select`
- Missing `@/components/ui/table`
- TypeScript errors from missing dependencies

### **4. API Route Inconsistencies**
**Problem**: API routes use different auth patterns
- Some bypass RLS, some don't
- Inconsistent error handling
- Different role checking methods

---

## 🎯 **RECOMMENDED ARCHITECTURE FIXES**

### **1. Standardized Auth Helper**
```typescript
// Create: /src/lib/auth-helpers.ts
export async function checkAdminRole(userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return profile?.role === "admin";
}
```

### **2. Unified Database Schema**
- Complete migration to mining-focused schema
- Standardize all plan references to use `min_amount`/`max_amount`
- Add all mining-specific columns

### **3. Component Standardization**
- Ensure all required UI components exist
- Fix TypeScript errors
- Standardize component interfaces

### **4. API Route Patterns**
- Use admin client for all admin operations
- Standardize error handling
- Consistent role checking across all routes

---

## 🚀 **IMPLEMENTATION STRATEGY**

### **Phase 1: Database Cleanup**
1. Run RLS disable script to fix immediate issues
2. Ensure all users have proper profiles
3. Standardize admin role assignment

### **Phase 2: Component Fixes**
1. Add missing UI components
2. Fix TypeScript errors
3. Update component interfaces

### **Phase 3: API Standardization**
1. Update all API routes with consistent auth
2. Use admin client for role checking
3. Standardize error responses

### **Phase 4: Schema Migration**
1. Complete mining schema upgrade
2. Migrate all old data references
3. Add mining-specific features

---

## 📋 **CURRENT STATUS**

### **✅ Working:**
- Basic Next.js 15 setup
- Supabase integration
- UI components (most)
- Landing page with mining theme
- Basic authentication

### **⚠️ Issues:**
- Admin access blocked by RLS
- Missing UI components
- Schema inconsistencies
- API auth patterns

### **🔄 Next Steps:**
1. Fix immediate RLS/admin issues
2. Add missing components
3. Standardize API patterns
4. Complete mining schema migration

---

This analysis shows your platform has a solid foundation but needs systematic fixes to resolve the cascading issues you've been experiencing. The root cause is inconsistent patterns across authentication, database access, and component dependencies.
