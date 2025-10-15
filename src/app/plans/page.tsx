import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
