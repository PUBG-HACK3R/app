import { redirect } from "next/navigation";

export default async function ModernDashboardPage() {
  // Redirect to main dashboard
  redirect("/dashboard");
}
