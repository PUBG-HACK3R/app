import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminMain } from "@/components/admin-v2/admin-main";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Check authentication first
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/auth/signin");
  }

  // Check admin role using admin client
  const adminClient = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    redirect("/dashboard");
  }

  return <AdminMain />;
}
