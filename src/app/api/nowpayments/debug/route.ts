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

    // Test 3: Try estimate with different currency combinations
    const testEstimates = [];
    const testCurrencies = ['usdttrc20', 'USDTTRC20', 'usdt', 'trx', 'btc'];
    const priceCurrencies = ['usd', 'USD', 'usdt', 'USDT'];
    
    for (const priceCurrency of priceCurrencies) {
      for (const payCurrency of testCurrencies) {
        try {
          const estimateRes = await fetch(`${baseUrl}/estimate?amount=100&currency_from=${priceCurrency}&currency_to=${payCurrency}`, {
            headers: { "x-api-key": apiKey },
          });
          
          const estimateData = estimateRes.ok ? await estimateRes.json() : await estimateRes.text();
          testEstimates.push({
            from: priceCurrency,
            to: payCurrency,
            status: estimateRes.status,
            success: estimateRes.ok,
            data: estimateData
          });
        } catch (err) {
          testEstimates.push({
            from: priceCurrency,
            to: payCurrency,
            status: 'error',
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }
    }

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
      timestamp: new Date().toISOString(),
      tests: {
        apiStatus: {
          status: statusRes.status,
          ok: statusRes.ok,
          data: statusData
        },
        currencies: {
          status: currenciesRes.status,
          ok: currenciesRes.ok,
          totalCurrencies: currenciesData?.currencies?.length || 0,
          usdtCurrencies,
          trc20Currencies,
          allCurrencies: currenciesData?.currencies || [],
          // Check for common alternatives
          alternatives: {
            usdt: currenciesData?.currencies?.includes?.("usdt") || false,
            USDT: currenciesData?.currencies?.includes?.("USDT") || false,
            usdttrc20: currenciesData?.currencies?.includes?.("usdttrc20") || false,
            USDTTRC20: currenciesData?.currencies?.includes?.("USDTTRC20") || false,
            trx: currenciesData?.currencies?.includes?.("trx") || false,
            TRX: currenciesData?.currencies?.includes?.("TRX") || false,
            btc: currenciesData?.currencies?.includes?.("btc") || false,
            BTC: currenciesData?.currencies?.includes?.("BTC") || false,
            eth: currenciesData?.currencies?.includes?.("eth") || false,
            ETH: currenciesData?.currencies?.includes?.("ETH") || false
          }
        },
        estimates: testEstimates
      },
      config: {
        baseUrl,
        apiKeyConfigured: !!apiKey,
        defaultCurrency: process.env.NEXT_PUBLIC_NOWPAYMENTS_CURRENCY || "usdttrc20"
      },
      recommendations: {
        workingCombinations: testEstimates.filter(e => e.success),
        failedCombinations: testEstimates.filter(e => !e.success)
      }
    });

  } catch (error: any) {
    console.error("NOWPayments debug error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
