import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to modern settings
  redirect("/settings/modern");
}
