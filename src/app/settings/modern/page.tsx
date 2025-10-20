import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileLogoutButton } from "@/components/profile-logout-button";
import { NeedHelpButton } from "@/components/need-help-button";
import { UserReferralLevelBadge } from "@/components/user-referral-level-badge";
import { 
  User, 
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Star,
  Users,
  Gift,
  CreditCard,
  Lock,
  Globe,
  Moon,
  Sun,
  TrendingUp
} from "lucide-react";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ModernSettingsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/settings/modern");
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 pt-16 pb-20">

      <div className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-3xl border border-blue-700/30 p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {profile?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-blue-200 text-sm mb-3">{user.email}</div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                Active Member
              </Badge>
              <UserReferralLevelBadge compact={true} />
            </div>
          </div>
        </div>

        {/* Referral Level Card */}
        <UserReferralLevelBadge showDetails={true} className="mb-6" />

        {/* Settings Menu */}
        <div className="space-y-3">
          <Link href="/wallet" className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">My Wallet</div>
              <div className="text-sm text-gray-400">View balance and transactions</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link href="/active-plans" className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">My Investments</div>
              <div className="text-sm text-gray-400">Active investment plans</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link href="/referrals" className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Invite Friends</div>
              <div className="text-sm text-gray-400">Earn rewards & level up</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Need Help Button */}
        <div className="pt-4">
          <NeedHelpButton 
            variant="outline" 
            className="w-full border-blue-600/50 text-blue-300 hover:bg-blue-600/20"
          />
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <ProfileLogoutButton />
        </div>

        {/* App Version */}
        <div className="text-center text-gray-500 text-sm pt-4">
          WeEarn v1.0.0
        </div>
      </div>
    </div>
  );
}
