import { redirect } from "next/navigation";

export default async function WalletPage() {
  // Redirect to modern wallet
  redirect("/wallet/modern");
}
