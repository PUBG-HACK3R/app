import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function requireAdminAuth() {
  try {
    // Get the authenticated user
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Admin auth - No authenticated user:", authError);
      redirect("/admin/login");
    }

    // Check admin role using admin client to bypass RLS
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.log("Admin auth - Not admin or profile error:", profileError, profile?.role);
      redirect("/admin/login");
    }

    return {
      user,
      profile
    };
  } catch (error) {
    console.error("Admin auth error:", error);
    redirect("/admin/login");
  }
}

export async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    return !error && profile?.role === 'admin';
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}
