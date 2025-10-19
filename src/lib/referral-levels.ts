import { ReferralLevel, ReferralLevelProgress, UserReferralLevel } from '@/types/referral-levels';

/**
 * Calculate the current level and progress for a user based on their referral count
 */
export function calculateReferralLevelProgress(
  referralCount: number,
  allLevels: ReferralLevel[],
  userLevelData?: UserReferralLevel
): ReferralLevelProgress {
  // Sort levels by order
  const sortedLevels = [...allLevels].sort((a, b) => a.level_order - b.level_order);
  
  // Find current level (highest level where user meets requirements)
  let currentLevel: ReferralLevel | null = null;
  for (let i = sortedLevels.length - 1; i >= 0; i--) {
    if (referralCount >= sortedLevels[i].min_referrals) {
      currentLevel = sortedLevels[i];
      break;
    }
  }
  
  // Find next level
  let nextLevel: ReferralLevel | null = null;
  if (currentLevel) {
    const currentIndex = sortedLevels.findIndex(l => l.id === currentLevel!.id);
    if (currentIndex < sortedLevels.length - 1) {
      nextLevel = sortedLevels[currentIndex + 1];
    }
  } else {
    // User hasn't reached first level yet
    nextLevel = sortedLevels[0];
  }
  
  // Calculate progress to next level
  let referralsNeededForNext = 0;
  let progressPercentage = 0;
  
  if (nextLevel) {
    referralsNeededForNext = Math.max(0, nextLevel.min_referrals - referralCount);
    const currentLevelMin = currentLevel?.min_referrals || 0;
    const totalNeeded = nextLevel.min_referrals - currentLevelMin;
    const currentProgress = referralCount - currentLevelMin;
    progressPercentage = totalNeeded > 0 ? Math.min(100, (currentProgress / totalNeeded) * 100) : 0;
  } else {
    // User is at max level
    progressPercentage = 100;
  }
  
  return {
    current_level: currentLevel,
    next_level: nextLevel,
    current_referrals: referralCount,
    referrals_needed_for_next: referralsNeededForNext,
    progress_percentage: Math.round(progressPercentage),
    total_rewards_earned: userLevelData?.total_level_rewards || 0,
    pending_rewards: [], // Will be populated by API
    all_levels: sortedLevels
  };
}

/**
 * Check if user has earned new level rewards and return the levels they should be rewarded for
 */
export function checkForNewLevelRewards(
  currentReferrals: number,
  previousReferrals: number,
  allLevels: ReferralLevel[]
): ReferralLevel[] {
  const sortedLevels = [...allLevels].sort((a, b) => a.level_order - b.level_order);
  const newLevelsEarned: ReferralLevel[] = [];
  
  for (const level of sortedLevels) {
    // Skip bronze level (no reward)
    if (level.level_order === 0) continue;
    
    // Check if user crossed this level threshold
    if (previousReferrals < level.min_referrals && currentReferrals >= level.min_referrals) {
      newLevelsEarned.push(level);
    }
  }
  
  return newLevelsEarned;
}

/**
 * Get level by name
 */
export function getLevelByName(levelName: string, allLevels: ReferralLevel[]): ReferralLevel | null {
  return allLevels.find(level => level.level_name.toLowerCase() === levelName.toLowerCase()) || null;
}

/**
 * Get level icon component name based on level
 */
export function getLevelIcon(levelName: string): string {
  switch (levelName.toLowerCase()) {
    case 'bronze':
      return 'Shield';
    case 'silver':
      return 'Award';
    case 'gold':
      return 'Crown';
    case 'diamond':
      return 'Gem';
    default:
      return 'Shield';
  }
}

/**
 * Get level color for UI display
 */
export function getLevelColor(levelName: string): string {
  switch (levelName.toLowerCase()) {
    case 'bronze':
      return '#CD7F32';
    case 'silver':
      return '#C0C0C0';
    case 'gold':
      return '#FFD700';
    case 'diamond':
      return '#B9F2FF';
    default:
      return '#CD7F32';
  }
}
