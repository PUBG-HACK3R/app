import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import ClientPlansPage from "./client-page";

export default async function PlansPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/plans");
  }

  return <ClientPlansPage />;
}
