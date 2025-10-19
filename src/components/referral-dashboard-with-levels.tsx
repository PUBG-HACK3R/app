"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SupportButton } from "@/components/support-button";
import { NeedHelpButton } from "@/components/need-help-button";
import { toast } from "sonner";
import { 
  Users, 
  DollarSign, 
  Share2, 
  Copy, 
  TrendingUp,
  Gift,
  Crown,
  Award,
  Shield,
  Gem,
  Star,
  Target,
  RefreshCw
} from "lucide-react";
import { ReferralLevelProgress, ReferralLevel, UserReferralLevel, ReferralLevelReward } from "@/types/referral-levels";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalEarnings: number;
  referrals: any[];
  qualifiedReferralsList: any[];
  referralLink: string;
}

interface LevelData {
  user_level_data: UserReferralLevel;
  progress: ReferralLevelProgress;
  level_rewards: ReferralLevelReward[];
  all_levels: ReferralLevel[];
}

export function ReferralDashboardWithLevels() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching referral and level data...');
      
      // Fetch both referral data and level data in parallel
      const [referralResponse, levelResponse] = await Promise.all([
        fetch(`/api/referrals-v2?_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`/api/referral-levels?_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      ]);

      if (referralResponse.ok && levelResponse.ok) {
        const referralData = await referralResponse.json();
        const levelData = await levelResponse.json();
        
        setReferralData(referralData);
        setLevelData(levelData);
        
        console.log('✅ All data loaded successfully');
        toast.success(`Loaded ${referralData.totalReferrals} referrals`);
      } else {
        console.error('❌ API failed');
        toast.error('Failed to load data');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = async (text: string, type: string) => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch (err) {
      toast.error(`Failed to copy ${type}`);
    } finally {
      setCopying(false);
    }
  };

  const getLevelIcon = (levelName: string) => {
    switch (levelName?.toLowerCase()) {
      case 'bronze': return Shield;
      case 'silver': return Award;
      case 'gold': return Crown;
      case 'diamond': return Gem;
      default: return Shield;
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading referral data...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!referralData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div className="text-center">
          <p>Failed to load referral data</p>
          <Button onClick={fetchData} className="mt-4">Try Again</Button>
        </div>
      </main>
    );
  }

  // If level data is not available, show basic dashboard
  if (!levelData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground">
            Level system setup required. Please contact admin.
          </p>
        </div>
        
        {/* Basic Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {referralData.totalReferrals}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Referral Code</CardTitle>
              <Gift className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{referralData.referralCode}</div>
              <Button
                onClick={() => copyToClipboard(referralData.referralCode, "Referral code")}
                disabled={copying}
                size="sm"
                variant="outline"
                className="mt-2 w-full"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Code
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Share Link</CardTitle>
              <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-purple-900 dark:text-purple-100 truncate mb-2">
                {referralData.referralLink}
              </div>
              <Button
                onClick={() => copyToClipboard(referralData.referralLink, "Referral link")}
                disabled={copying}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const currentLevel = levelData.progress.current_level;
  const nextLevel = levelData.progress.next_level;
  const LevelIcon = currentLevel ? getLevelIcon(currentLevel.level_name) : Shield;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground">
            Earn rewards by inviting friends and level up your status
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <SupportButton variant="outline">
            Need Help?
          </SupportButton>
        </div>
      </div>

      {/* Current Level Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div 
              className="p-3 rounded-full"
              style={{ backgroundColor: currentLevel?.level_color + '20' }}
            >
              <LevelIcon 
                className="h-6 w-6" 
                style={{ color: currentLevel?.level_color }}
              />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: currentLevel?.level_color }}>
                {currentLevel?.level_name || 'Bronze'} Level
              </div>
              <div className="text-sm text-muted-foreground">
                {referralData.qualifiedReferrals || 0} qualified referrals • ${levelData.user_level_data.total_level_rewards} earned
              </div>
              <div className="text-xs text-muted-foreground">
                ({referralData.totalReferrals} total signups, {referralData.qualifiedReferrals || 0} with deposits & plans)
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextLevel ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress to {nextLevel.level_name}</span>
                <span>{levelData.progress.referrals_needed_for_next} more referrals needed</span>
              </div>
              <Progress value={levelData.progress.progress_percentage} className="h-3" />
              <div className="text-xs text-muted-foreground">
                {levelData.progress.progress_percentage}% complete • Next reward: ${nextLevel.reward_amount}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-lg font-semibold">Maximum Level Reached!</p>
              <p className="text-sm text-muted-foreground">You've achieved the highest referral level</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Qualified Referrals</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {referralData.qualifiedReferrals || 0}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              With deposits & plans
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {referralData.totalReferrals} total signups
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Level Rewards</CardTitle>
            <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              ${levelData.user_level_data.total_level_rewards}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              From level achievements
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Referral Code</CardTitle>
            <Gift className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{referralData.referralCode}</div>
            <Button
              onClick={() => copyToClipboard(referralData.referralCode, "Referral code")}
              disabled={copying}
              size="sm"
              variant="outline"
              className="mt-2 w-full"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Code
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Share Link</CardTitle>
            <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-purple-900 dark:text-purple-100 truncate mb-2">
              {referralData.referralLink}
            </div>
            <Button
              onClick={() => copyToClipboard(referralData.referralLink, "Referral link")}
              disabled={copying}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Link
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Level System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Referral Levels & Rewards
          </CardTitle>
          <CardDescription>
            Achieve these milestones with qualified referrals (users who deposit & purchase plans) to earn bonus rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {levelData.all_levels.map((level) => {
              const LevelIcon = getLevelIcon(level.level_name);
              const isCurrentLevel = currentLevel?.id === level.id;
              const isAchieved = (referralData.qualifiedReferrals || 0) >= level.min_referrals;
              
              return (
                <div 
                  key={level.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentLevel 
                      ? 'border-primary bg-primary/5' 
                      : isAchieved 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                        : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: level.level_color + '20' }}
                    >
                      <LevelIcon 
                        className="h-5 w-5" 
                        style={{ color: level.level_color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: level.level_color }}>
                        {level.level_name}
                      </h3>
                      {isCurrentLevel && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">{level.min_referrals}</span> qualified referrals needed
                    </p>
                    {level.reward_amount > 0 && (
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        ${level.reward_amount} reward
                      </p>
                    )}
                    {isAchieved && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        ✓ Achieved
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Rewards */}
      {levelData.progress.pending_rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Pending Level Rewards
            </CardTitle>
            <CardDescription>Congratulations! You have rewards waiting to be processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {levelData.progress.pending_rewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: reward.level?.level_color + '20' }}
                    >
                      {reward.level && (
                        React.createElement(getLevelIcon(reward.level.level_name), {
                          className: "h-4 w-4",
                          style: { color: reward.level.level_color }
                        })
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{reward.level?.level_name} Level Achievement</p>
                      <p className="text-sm text-muted-foreground">
                        Earned with {reward.referrals_at_time} referrals
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${reward.reward_amount}</p>
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals List */}
      {referralData.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>People who joined using your referral code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {referralData.referrals.map((referral, index) => (
                <div key={referral.user_id || index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{referral.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Need Help Button */}
      <div className="text-center py-6">
        <NeedHelpButton 
          variant="outline" 
          className="border-purple-600/50 text-purple-300 hover:bg-purple-600/20"
        />
      </div>
    </main>
  );
}
