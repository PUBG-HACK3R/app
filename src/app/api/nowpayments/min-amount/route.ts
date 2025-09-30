import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currencyFrom = searchParams.get("currency_from") || "usd";
    const currencyTo = searchParams.get("currency_to") || "usdttrc20";
    
    const baseUrl = process.env.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1";
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "NOWPayments API key is not configured" }, { status: 500 });
    }

    console.log(`Fetching minimum amount for ${currencyFrom} to ${currencyTo}`);

    const res = await fetch(`${baseUrl}/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      console.error("NOWPayments min-amount API Error:", {
        status: res.status,
        statusText: res.statusText,
      });
      
      // Return fallback minimum for USDT TRC20
      return NextResponse.json({
        min_amount: "12.00",
        currency_from: currencyFrom,
        currency_to: currencyTo,
        fallback: true,
        message: "Using fallback minimum amount"
      });
    }

    const data = await res.json();
    console.log("NOWPayments min-amount response:", data);

    return NextResponse.json({
      min_amount: data.min_amount || "12.00",
      currency_from: currencyFrom,
      currency_to: currencyTo,
      fallback: false
    });
  } catch (err: any) {
    console.error("Error fetching minimum amount:", err);
    
    // Return fallback minimum
    return NextResponse.json({
      min_amount: "12.00",
      currency_from: "usd",
      currency_to: "usdttrc20",
      fallback: true,
      error: err.message
    });
  }
}
