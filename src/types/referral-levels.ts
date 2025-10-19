// Types for the referral level system

export interface ReferralLevel {
  id: string;
  level_name: string;
  level_order: number;
  min_referrals: number;
  reward_amount: number;
  level_color: string;
  level_icon: string;
  is_active: boolean;
  created_at: string;
}

export interface UserReferralLevel {
  id: string;
  user_id: string;
  current_level_id: string | null;
  total_referrals: number;
  total_level_rewards: number;
  last_level_update: string;
  created_at: string;
  updated_at: string;
  // Joined data
  current_level?: ReferralLevel;
}

export interface ReferralLevelReward {
  id: string;
  user_id: string;
  level_id: string;
  reward_amount: number;
  referrals_at_time: number;
  status: 'pending' | 'paid';
  earned_at: string;
  paid_at: string | null;
  // Joined data
  level?: ReferralLevel;
}

export interface ReferralLevelProgress {
  current_level: ReferralLevel | null;
  next_level: ReferralLevel | null;
  current_referrals: number;
  referrals_needed_for_next: number;
  progress_percentage: number;
  total_rewards_earned: number;
  pending_rewards: ReferralLevelReward[];
  all_levels: ReferralLevel[];
}

// Constants for level system
export const REFERRAL_LEVELS = {
  BRONZE: 'Bronze',
  SILVER: 'Silver', 
  GOLD: 'Gold',
  DIAMOND: 'Diamond'
} as const;

export const LEVEL_REQUIREMENTS = {
  [REFERRAL_LEVELS.BRONZE]: { min_referrals: 0, reward: 0 },
  [REFERRAL_LEVELS.SILVER]: { min_referrals: 5, reward: 10 },
  [REFERRAL_LEVELS.GOLD]: { min_referrals: 20, reward: 50 },
  [REFERRAL_LEVELS.DIAMOND]: { min_referrals: 50, reward: 300 }
} as const;
