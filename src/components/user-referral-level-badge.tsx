"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield,
  Award,
  Crown,
  Gem,
  Users,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { ReferralLevelProgress } from "@/types/referral-levels";

interface UserReferralLevelBadgeProps {
  userId?: string;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function UserReferralLevelBadge({ 
  userId, 
  showDetails = false, 
  compact = true,
  className = "" 
}: UserReferralLevelBadgeProps) {
  const [levelData, setLevelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevelData = async () => {
      try {
        const response = await fetch('/api/referral-levels', {
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          setLevelData(data);
        }
      } catch (error) {
        console.error('Failed to fetch level data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLevelData();
  }, [userId]);

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
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>
    );
  }

  if (!levelData?.progress?.current_level) {
    return null;
  }

  const currentLevel = levelData.progress.current_level;
  const LevelIcon = getLevelIcon(currentLevel.level_name);

  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 ${className}`}
        style={{ 
          borderColor: currentLevel.level_color,
          color: currentLevel.level_color,
          backgroundColor: currentLevel.level_color + '10'
        }}
      >
        <LevelIcon className="h-3 w-3" />
        {currentLevel.level_name}
      </Badge>
    );
  }

  if (showDetails) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: currentLevel.level_color + '20' }}
              >
                <LevelIcon 
                  className="h-5 w-5" 
                  style={{ color: currentLevel.level_color }}
                />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: currentLevel.level_color }}>
                  {currentLevel.level_name} Level
                </h3>
                <p className="text-sm text-muted-foreground">
                  {levelData.progress.current_referrals} referrals
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/referrals">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Details
              </a>
            </Button>
          </div>

          {levelData.progress.next_level && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {levelData.progress.next_level.level_name}</span>
                <span>{levelData.progress.referrals_needed_for_next} more needed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: currentLevel.level_color,
                    width: `${levelData.progress.progress_percentage}%`
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{levelData.progress.current_referrals} referred</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>${levelData.user_level_data.total_level_rewards} earned</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className="p-1 rounded-full"
        style={{ backgroundColor: currentLevel.level_color + '20' }}
      >
        <LevelIcon 
          className="h-4 w-4" 
          style={{ color: currentLevel.level_color }}
        />
      </div>
      <span 
        className="font-medium"
        style={{ color: currentLevel.level_color }}
      >
        {currentLevel.level_name}
      </span>
    </div>
  );
}
