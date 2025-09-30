import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl = process.env.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1";
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "NOWPayments API key is not configured",
        status: "error"
      }, { status: 500 });
    }

    console.log("Testing NOWPayments API connection...");

    // Test 1: Check API status
    const statusRes = await fetch(`${baseUrl}/status`, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    
    const statusData = await statusRes.json();
    console.log("Status API Response:", { status: statusRes.status, data: statusData });

    // Test 2: Get available currencies
    const currenciesRes = await fetch(`${baseUrl}/currencies`, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    
    const currenciesData = await currenciesRes.json();
    console.log("Currencies API Response:", { status: currenciesRes.status, data: currenciesData });

    // Test 3: Get minimum payment amount for USDTTRC20
    const minAmountRes = await fetch(`${baseUrl}/min-amount?currency_from=USDT&currency_to=USDTTRC20`, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    
    const minAmountData = await minAmountRes.json();
    console.log("Min Amount API Response:", { status: minAmountRes.status, data: minAmountData });

    // Find USDT-related currencies
    const usdtCurrencies = currenciesData?.currencies?.filter?.((c: string) => 
      c.toLowerCase().includes('usdt')
    ) || [];
    
    // Find TRC20 currencies
    const trc20Currencies = currenciesData?.currencies?.filter?.((c: string) => 
      c.toLowerCase().includes('trc20')
    ) || [];

    return NextResponse.json({
      status: "success",
      tests: {
        apiStatus: {
          status: statusRes.status,
          ok: statusRes.ok,
          data: statusData
        },
        currencies: {
          status: currenciesRes.status,
          ok: currenciesRes.ok,
          usdtTrc20Available: currenciesData?.currencies?.includes?.("USDTTRC20") || false,
          totalCurrencies: currenciesData?.currencies?.length || 0,
          usdtCurrencies,
          trc20Currencies,
          // Check for common alternatives
          alternatives: {
            usdt: currenciesData?.currencies?.includes?.("USDT") || false,
            usdttrc20: currenciesData?.currencies?.includes?.("USDTTRC20") || false,
            trx: currenciesData?.currencies?.includes?.("TRX") || false,
            btc: currenciesData?.currencies?.includes?.("BTC") || false,
            eth: currenciesData?.currencies?.includes?.("ETH") || false
          }
        },
        minAmount: {
          status: minAmountRes.status,
          ok: minAmountRes.ok,
          data: minAmountData
        }
      },
      config: {
        baseUrl,
        apiKeyConfigured: !!apiKey,
        defaultCurrency: process.env.NEXT_PUBLIC_NOWPAYMENTS_CURRENCY || "USDTTRC20"
      },
      recommendations: {
        issue: "USDTTRC20 not available",
        solutions: [
          "Enable USDTTRC20 in NOWPayments dashboard",
          "Use alternative currency like TRX or BTC",
          "Contact NOWPayments support to enable USDT TRC20"
        ]
      }
    });

  } catch (error: any) {
    console.error("NOWPayments test error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
