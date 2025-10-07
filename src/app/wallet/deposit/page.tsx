"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function DepositRedirect() {
  const search = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to the centralized deposit page
    const params = search.toString();
    const redirectUrl = params ? `/wallet/deposit/centralized?${params}` : '/wallet/deposit/centralized';
    router.replace(redirectUrl);
  }, [search, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to deposit...</p>
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositRedirect />
    </Suspense>
  );
}
