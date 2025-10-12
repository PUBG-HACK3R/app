"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SupportButton } from "@/components/support-button";
import { toast } from "sonner";
import { 
  Users, 
  DollarSign, 
  Share2, 
  Copy, 
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle,
  Gift,
  UserPlus,
  Coins,
  Link as LinkIcon,
  Twitter,
  Facebook,
  MessageCircle
} from "lucide-react";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingCommissions: number;
  paidCommissions: number;
  referredBy: string | null;
  referrals: any[];
  commissions: any[];
  referralLink: string;
}

export function ReferralDashboard() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/referrals');
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Referral Dashboard - API Response:', data);
        console.log('🔍 Total Referrals:', data.totalReferrals);
        console.log('🔍 Referrals Array:', data.referrals);
        setReferralData(data);
      } else {
        toast.error('Failed to load referral data');
      }
    } catch (error) {
      console.error('🔍 Referral Dashboard - Fetch Error:', error);
      toast.error('Error loading referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralData) return;
    
    setCopying(true);
    try {
      await navigator.clipboard.writeText(referralData.referralLink);
      toast.success('Referral link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    } finally {
      setCopying(false);
    }
  };

  const copyReferralCode = async () => {
    if (!referralData) return;
    
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      toast.success('Referral code copied!');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const shareOnSocial = (platform: string) => {
    if (!referralData) return;
    
    const text = `Join WeEarn and start earning daily returns on your crypto investments! Use my referral code: ${referralData.referralCode}`;
    const url = referralData.referralLink;
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!referralData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <p>Failed to load referral data</p>
          <Button onClick={fetchReferralData} className="mt-4">Try Again</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground">
            Earn 10% commission on every deposit your referrals make
          </p>
        </div>
        <SupportButton variant="outline">
          Need Help?
        </SupportButton>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {referralData.totalReferrals}
              {/* Debug info - remove after fixing */}
              <span className="text-xs text-red-500 block">
                Debug: {JSON.stringify({total: referralData.totalReferrals, arrayLength: referralData.referrals?.length})}
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Active referrals
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">${referralData.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              All-time commissions
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">${referralData.pendingCommissions.toFixed(2)}</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Commission Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">10%</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              On all deposits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with friends to earn 10% commission on their deposits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={referralData.referralLink}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={copyReferralLink}
                disabled={copying}
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copying ? 'Copying...' : 'Copy'}
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Your referral code:</span>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={copyReferralCode}
              >
                {referralData.referralCode}
                <Copy className="h-3 w-3 ml-1" />
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('twitter')}
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('facebook')}
                className="flex items-center gap-2"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('whatsapp')}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Share Your Link</p>
                <p className="text-xs text-muted-foreground">Send your referral link to friends</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-green-600 dark:text-green-400">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">They Sign Up</p>
                <p className="text-xs text-muted-foreground">Friends register using your link</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Earn Commission</p>
                <p className="text-xs text-muted-foreground">Get 10% of their deposits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Referrals */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recent Referrals
            </CardTitle>
            <CardDescription>
              People who joined using your referral code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralData.referrals.length > 0 ? (
              <div className="space-y-3">
                {referralData.referrals.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {referral.profiles?.email?.split('@')[0]}***
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                      {referral.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet</p>
                <p className="text-sm">Share your link to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission History */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Commission History
            </CardTitle>
            <CardDescription>
              Your recent referral earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralData.commissions.length > 0 ? (
              <div className="space-y-3">
                {referralData.commissions.slice(0, 5).map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          ${commission.commission_amount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From {commission.profiles?.email?.split('@')[0]}*** • {commission.source_type}
                        </p>
                      </div>
                    </div>
                    <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                      {commission.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No commissions yet</p>
                <p className="text-sm">Earn when your referrals deposit!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
