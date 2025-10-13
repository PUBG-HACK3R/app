"use client";

import { useEffect } from "react";
import { backgroundEarnings } from "@/lib/background-earnings";

export function useBackgroundEarnings() {
  useEffect(() => {
    // Start background earnings checking
    const cleanup = backgroundEarnings.startBackgroundChecking();

    // Cleanup on unmount
    return cleanup;
  }, []);

  return {
    manualCheck: () => backgroundEarnings.manualCheck(),
    getLastCheckTime: () => backgroundEarnings.getLastCheckTime(),
    isChecking: () => backgroundEarnings.isCurrentlyChecking(),
  };
}
