"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function DepositContent() {
  const search = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to the deposit selection page with current parameters
    const params = new URLSearchParams();
    
    // Preserve all current search parameters
    search.forEach((value, key) => {
      params.set(key, value);
    });
    
    router.replace(`/wallet/deposit/select?${params.toString()}`);
  }, [search, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting to deposit options...</p>
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositContent />
    </Suspense>
  );
}
