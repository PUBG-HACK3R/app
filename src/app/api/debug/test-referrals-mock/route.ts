import { NextResponse } from "next/server";

export async function GET() {
  // Mock the exact response structure that the referrals API should return
  const mockResponse = {
    referralCode: "REF9848880B",
    totalReferrals: 2, // This should fix the 0 display
    totalEarnings: 10.00,
    pendingCommissions: 0,
    paidCommissions: 10.00,
    referredBy: "51a35a1a-0bd0-4e20-bd85-0147b07f55b7",
    referrals: [
      {
        user_id: "c589323c-b3cd-4beb-add2-956c9de2df84",
        email: "khan@khan.com",
        created_at: "2025-10-12T06:28:25.757374+00:00"
      },
      {
        user_id: "686c5da4-c1cb-4522-a84c-3f9ce3fbdf0f",
        email: "testing@ref.com",
        created_at: "2025-10-11T07:02:52.549866+00:00"
      }
    ],
    commissions: [],
    referralLink: "https://weearn.sbs/signup?ref=REF9848880B"
  };

  console.log('🧪 Mock referrals API returning:', mockResponse);

  return NextResponse.json(mockResponse);
}
