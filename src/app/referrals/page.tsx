import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SimpleCopyButton } from "@/components/simple-copy-button";

export default async function ReferralsPage() {
  try {
    const authUser = await requireAuth();
    const admin = getSupabaseAdminClient();

    // Get user's profile with referral info
    const { data: profile } = await admin
      .from("profiles")
      .select("referral_code, referred_by, email")
      .eq("user_id", authUser.id)
      .single();

    // Generate referral code if it doesn't exist
    let referralCode = profile?.referral_code;
    if (!referralCode) {
      referralCode = `REF${authUser.id.substring(0, 8).toUpperCase()}`;
      await admin
        .from("profiles")
        .update({ referral_code: referralCode })
        .eq("user_id", authUser.id);
    }

    // Get referrals count
    const { count: totalReferrals } = await admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", authUser.id);

    const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
            <p className="text-gray-400">Earn 5% commission on every referral</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-2xl font-bold text-blue-400">{totalReferrals || 0}</div>
              <div className="text-gray-400 text-sm">Total Referrals</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="text-2xl font-bold text-orange-400">5%</div>
              <div className="text-gray-400 text-sm">Commission Rate</div>
            </div>
          </div>

          {/* Referral Link */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Your Referral Link</h2>
            <div className="flex gap-2">
              <input 
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm"
              />
              <SimpleCopyButton text={referralLink} />
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Share this link and earn 5% commission on every investment made by your referrals.
            </p>
          </div>

          {/* How it Works */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-4">How it Works</h2>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                <div>Share your referral link with friends and family</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                <div>They sign up and make their first mining investment</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                <div>You earn 5% commission on their investment instantly</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  } catch (error) {
    console.error("Referrals page error:", error);
    redirect("/login?next=/referrals");
  }
}
