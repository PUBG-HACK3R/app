/**
 * Clean Database Schema for WeEarn Platform
 * Simplified, error-free database structure
 */

// User Profile
export interface UserProfile {
  id: string;
  user_id: string; // Supabase auth user ID
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
  referral_code: string; // Unique referral code for this user
  referred_by?: string; // Referral code of who referred this user
  created_at: string;
  updated_at: string;
}

// Investment Plans
export interface InvestmentPlan {
  id: string;
  name: string;
  description: string;
  min_amount: number; // Minimum investment in USDT
  max_amount: number; // Maximum investment in USDT
  daily_roi_percentage: number; // Daily ROI percentage (e.g., 1.5 = 1.5%) or total percentage for 'end' type
  duration_days: number; // Plan duration in days
  payout_type: 'daily' | 'end'; // Whether earnings are paid daily or at the end
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User Balances (Single source of truth)
export interface UserBalance {
  id: string;
  user_id: string;
  available_balance: number; // Available USDT balance
  locked_balance: number; // Locked in investments
  total_deposited: number; // Total ever deposited
  total_withdrawn: number; // Total ever withdrawn
  total_earned: number; // Total earnings from investments
  updated_at: string;
}

// Deposits (NOWPayments only)
export interface Deposit {
  id: string;
  user_id: string;
  order_id: string; // NOWPayments order ID
  amount_usdt: number;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  payment_id?: string; // NOWPayments payment ID
  tx_hash?: string; // Transaction hash
  nowpayments_data?: any; // Raw NOWPayments webhook data
  created_at: string;
  confirmed_at?: string;
}

// User Investments/Subscriptions
export interface UserInvestment {
  id: string;
  user_id: string;
  plan_id: string;
  amount_invested: number; // USDT amount invested
  daily_roi_percentage: number; // ROI at time of investment (daily % or total % for 'end' type)
  duration_days: number; // Duration at time of investment
  payout_type: 'daily' | 'end'; // Whether earnings are paid daily or at the end
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  total_earned: number; // Total earned so far
  last_earning_date?: string; // Last date earnings were processed
  created_at: string;
}

// Daily Earnings Records
export interface DailyEarning {
  id: string;
  user_id: string;
  investment_id: string;
  amount_usdt: number;
  earning_date: string; // Date of earning (YYYY-MM-DD)
  created_at: string;
}

// Withdrawals
export interface Withdrawal {
  id: string;
  user_id: string;
  amount_usdt: number;
  fee_usdt: number;
  net_amount_usdt: number;
  wallet_address: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'expired';
  admin_notes?: string;
  tx_hash?: string;
  created_at: string;
  processed_at?: string;
  expires_at: string;
}

// Referral Commissions
export interface ReferralCommission {
  id: string;
  referrer_user_id: string; // User who gets the commission
  referred_user_id: string; // User who made the deposit/investment
  source_type: 'deposit' | 'investment';
  source_amount: number; // Original amount that generated commission
  commission_percentage: number; // Commission rate applied
  commission_amount: number; // Commission earned
  status: 'pending' | 'paid';
  created_at: string;
  paid_at?: string;
}

// Transaction Log (For audit trail)
export interface TransactionLog {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'referral_commission' | 'investment';
  amount_usdt: number;
  description: string;
  reference_id?: string; // ID of related record (deposit_id, withdrawal_id, etc.)
  balance_before: number;
  balance_after: number;
  created_at: string;
}

// Database table names
export const TABLES = {
  USER_PROFILES: 'user_profiles',
  INVESTMENT_PLANS: 'investment_plans',
  USER_BALANCES: 'user_balances',
  DEPOSITS: 'deposits',
  USER_INVESTMENTS: 'user_investments',
  DAILY_EARNINGS: 'daily_earnings',
  WITHDRAWALS: 'withdrawals',
  REFERRAL_COMMISSIONS: 'referral_commissions',
  TRANSACTION_LOGS: 'transaction_logs'
} as const;
