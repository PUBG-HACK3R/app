"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Only show footer on the landing page (root path)
  const showFooter = pathname === "/";
  
  if (!showFooter) {
    return null;
  }
  
  return <SiteFooter />;
}
