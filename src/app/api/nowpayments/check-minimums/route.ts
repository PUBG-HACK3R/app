import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl = process.env.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1";
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "NOWPayments API key not configured" }, { status: 500 });
    }

    // Check minimum amounts for common currency pairs
    const currencyPairs = [
      { from: 'usd', to: 'usdttrc20' },
      { from: 'usd', to: 'usdtbsc' },
      { from: 'usd', to: 'usdt' },
      { from: 'usd', to: 'trx' },
      { from: 'usd', to: 'btc' },
      { from: 'usd', to: 'eth' }
    ];

    const minimums = [];

    for (const pair of currencyPairs) {
      try {
        const response = await fetch(`${baseUrl}/min-amount?currency_from=${pair.from}&currency_to=${pair.to}`, {
          headers: { "x-api-key": apiKey },
        });
        
        if (response.ok) {
          const data = await response.json();
          minimums.push({
            from: pair.from,
            to: pair.to,
            minAmount: parseFloat(data.min_amount || "0"),
            success: true,
            data
          });
        } else {
          minimums.push({
            from: pair.from,
            to: pair.to,
            success: false,
            error: `HTTP ${response.status}`,
            text: await response.text()
          });
        }
      } catch (error) {
        minimums.push({
          from: pair.from,
          to: pair.to,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Get available currencies
    let currencies = [];
    try {
      const currenciesRes = await fetch(`${baseUrl}/currencies`, {
        headers: { "x-api-key": apiKey },
      });
      if (currenciesRes.ok) {
        const currenciesData = await currenciesRes.json();
        currencies = currenciesData.currencies || [];
      }
    } catch (error) {
      console.warn("Failed to fetch currencies:", error);
    }

    return NextResponse.json({
      success: true,
      minimums,
      availableCurrencies: currencies.filter((c: string) => 
        c.toLowerCase().includes('usdt') || 
        ['trx', 'btc', 'eth', 'bnb'].includes(c.toLowerCase())
      ),
      recommendations: {
        currentSetting: "$20 USD minimum (set in your app)",
        nowpaymentsActual: minimums.filter(m => m.success).map(m => 
          `${m.from.toUpperCase()} → ${m.to.toUpperCase()}: $${m.minAmount}`
        ),
        suggestion: "Your $20 minimum is likely higher than NOWPayments requirements, which is good for avoiding small transactions."
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
