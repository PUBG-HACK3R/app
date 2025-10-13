"use client";

import { useBackgroundEarnings } from "@/hooks/use-background-earnings";

export function DashboardEarningsProvider() {
  // This component automatically starts background earnings checking
  useBackgroundEarnings();
  
  // This component doesn't render anything visible
  return null;
}
