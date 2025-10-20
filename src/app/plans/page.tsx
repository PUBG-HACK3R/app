import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ClientPlansPage from "./client-page";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
