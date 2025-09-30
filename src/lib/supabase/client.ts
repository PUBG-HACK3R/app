"use client";

import { createBrowserClient } from "@supabase/ssr";
import Cookies from "js-cookie";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => Cookies.get(name),
        set: (name: string, value: string, options: any) =>
          Cookies.set(name, value, {
            ...options,
            sameSite: "lax",
          }),
        remove: (name: string, options: any) => Cookies.remove(name, options),
      },
    }
  );
}
