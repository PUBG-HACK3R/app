"use client";

import { usePathname } from "next/navigation";
import { ModernHeader } from "@/components/modern-header";

// Pages where we don't want to show the header
const EXCLUDED_PAGES = [
  "/", // Landing page
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/signup-simple",
  "/login-simple",
  "/signup-server",
  "/login-server",
];

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Don't show header on excluded pages
  if (EXCLUDED_PAGES.includes(pathname)) {
    return null;
  }
  
  // Don't show on auth pages or admin pages
  if (pathname.startsWith("/auth/") || pathname.startsWith("/admin/")) {
    return null;
  }
  
  return <ModernHeader />;
}
