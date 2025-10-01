import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ReferralDashboard } from "@/components/referral-dashboard";

export default async function ReferralsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?next=/referrals");
  }

  return <ReferralDashboard />;
}
