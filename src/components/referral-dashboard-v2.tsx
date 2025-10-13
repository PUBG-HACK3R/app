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
  MessageCircle,
  RefreshCw
} from "lucide-react";

export function ReferralDashboardV2() {
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      console.log('🔍 V2: Fetching referral data...');
      
      const response = await fetch(`/api/referrals-v2?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 V2: Raw response:', data);

        // Set each piece of data individually
        const count = data.referrals?.length || 0;
        console.log('🔍 V2: Setting count to:', count);
        
        setReferralCount(count);
        setReferralCode(data.referralCode || "");
        setReferralLink(data.referralLink || "");
        setTotalEarnings(data.totalEarnings || 0);
        setReferralsList(data.referrals || []);

        console.log('✅ V2: All data set successfully');
        toast.success(`Loaded ${count} referrals`);
      } else {
        console.error('❌ V2: API failed:', response.status);
        toast.error('Failed to load referral data');
      }
    } catch (error) {
      console.error('❌ V2: Error:', error);
      toast.error('Error loading referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Referral Program V2</h1>
          <p className="text-muted-foreground">
            Earn 5% commission on every referral
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchReferralData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <SupportButton variant="outline">
            Need Help?
          </SupportButton>
        </div>
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
              {referralCount}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Active referrals ({referralCount} users)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              V2: Count={referralCount}, List={referralsList.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Commission earned
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Referral Code</CardTitle>
            <Gift className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{referralCode}</div>
            <Button
              onClick={() => copyToClipboard(referralCode, "Referral code")}
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
              {referralLink}
            </div>
            <Button
              onClick={() => copyToClipboard(referralLink, "Referral link")}
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

      {/* Referrals List */}
      {referralsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>People who joined using your referral code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {referralsList.map((referral, index) => (
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
    </main>
  );
}
