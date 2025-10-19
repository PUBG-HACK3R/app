"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield,
  Award,
  Crown,
  Gem,
  Users,
  DollarSign,
  TrendingUp,
  Star
} from "lucide-react";

const referralLevels = [
  {
    name: "Bronze",
    icon: Shield,
    color: "#CD7F32",
    minReferrals: 0,
    reward: 0,
    description: "Start your referral journey"
  },
  {
    name: "Silver",
    icon: Award,
    color: "#C0C0C0",
    minReferrals: 5,
    reward: 10,
    description: "Invite 5 friends and earn $10"
  },
  {
    name: "Gold",
    icon: Crown,
    color: "#FFD700",
    minReferrals: 20,
    reward: 50,
    description: "Reach 20 referrals for $50 bonus"
  },
  {
    name: "Diamond",
    icon: Gem,
    color: "#B9F2FF",
    minReferrals: 50,
    reward: 300,
    description: "Ultimate level: 50 referrals = $300"
  }
];

interface ReferralLevelsShowcaseProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function ReferralLevelsShowcase({ 
  className = "", 
  showTitle = true, 
  compact = false 
}: ReferralLevelsShowcaseProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Referral Rewards Program</h2>
          <p className="text-lg text-muted-foreground">
            Invite friends and unlock exclusive rewards as you level up
          </p>
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'md:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {referralLevels.map((level, index) => {
          const IconComponent = level.icon;
          
          return (
            <Card 
              key={level.name}
              className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                compact ? 'p-2' : ''
              }`}
              style={{ 
                borderColor: level.color + '40',
                background: `linear-gradient(135deg, ${level.color}10, ${level.color}05)`
              }}
            >
              <CardHeader className={compact ? "pb-2" : ""}>
                <div className="flex items-center gap-3">
                  <div 
                    className={`${compact ? 'p-2' : 'p-3'} rounded-full`}
                    style={{ backgroundColor: level.color + '20' }}
                  >
                    <IconComponent 
                      className={`${compact ? 'h-4 w-4' : 'h-6 w-6'}`}
                      style={{ color: level.color }}
                    />
                  </div>
                  <div>
                    <CardTitle 
                      className={`${compact ? 'text-lg' : 'text-xl'} font-bold`}
                      style={{ color: level.color }}
                    >
                      {level.name}
                    </CardTitle>
                    {level.minReferrals > 0 && (
                      <Badge 
                        variant="outline" 
                        className="text-xs mt-1"
                        style={{ borderColor: level.color, color: level.color }}
                      >
                        Level {index + 1}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className={compact ? "pt-0" : ""}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {level.minReferrals === 0 
                        ? "Starting level" 
                        : `${level.minReferrals} referrals needed`
                      }
                    </span>
                  </div>
                  
                  {level.reward > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                      <DollarSign className="h-4 w-4" />
                      <span>${level.reward} reward</span>
                    </div>
                  )}
                  
                  {!compact && (
                    <p className="text-sm text-muted-foreground">
                      {level.description}
                    </p>
                  )}
                </div>
                
                {/* Progress indicator for visual appeal */}
                <div className="mt-4">
                  <div 
                    className="h-2 rounded-full"
                    style={{ backgroundColor: level.color + '20' }}
                  >
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: level.color,
                        width: `${25 * (index + 1)}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!compact && (
        <div className="text-center space-y-4 pt-6">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Progressive rewards</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Instant payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>No limits</span>
            </div>
          </div>
          
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            Start Referring Friends
          </Button>
        </div>
      )}
    </div>
  );
}
