import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/database/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateInvoiceSchema = z.object({
  amount: z.number().positive().min(20, "Minimum amount is $20 USDT for USDT TRC20"),
  priceCurrency: z.string().default("usd"),
  payCurrency: z.string().default("usdtbsc"),
  planId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, priceCurrency, payCurrency, planId } = CreateInvoiceSchema.parse(body);
    
    const baseUrl = process.env.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1";
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "NOWPayments API key is not configured" }, { status: 500 });
    }
    
    // Check if the requested currency is available
    const currenciesRes = await fetch(`${baseUrl}/currencies`, {
      headers: { "x-api-key": apiKey },
    });
    
    if (!currenciesRes.ok) {
      console.error("Failed to fetch currencies:", currenciesRes.status, currenciesRes.statusText);
      // Continue without currency check - let NOWPayments handle it
      const availableCurrencies = [];
    } else {
      var currenciesData = await currenciesRes.json();
      var availableCurrencies = currenciesData?.currencies || [];
    }
    
    // Find the best available currency (case-insensitive)
    let finalPayCurrency = payCurrency;
    const currencyPriority = [
      'usdtbsc',      // Binance Smart Chain USDT (BEP20) - NOW FIRST!
      'USDTBSC',      // Uppercase fallback
      'usdt.bsc',     // Alternative format
      'usdt_bsc',     // Alternative format
      'usdttrc20',    // TRON USDT (TRC20) - NOW SECOND
      'USDTTRC20',    // Uppercase fallback
      'usdt.trc20',   // Alternative format
      'usdt_trc20',   // Alternative format
      'usdterc20',    // Ethereum USDT
      'usdtmatic',    // Polygon USDT
      'tusdtrc20',    // TrueUSD on TRC20
      'usdt',         // Plain USDT
      'trx',          // TRX as backup
      'btc',          // Bitcoin as backup
      'eth'           // Ethereum as backup
    ];
    
    // Check if requested currency exists (case-insensitive)
    const requestedCurrencyExists = availableCurrencies.some((c: string) => 
      c.toLowerCase() === payCurrency.toLowerCase()
    );
    
    if (!requestedCurrencyExists) {
      console.log(`Requested currency ${payCurrency} not available.`);
      console.log('Available USDT currencies:', availableCurrencies.filter((c: string) => 
        c.toLowerCase().includes('usdt')
      ));
      
      // Find the first available currency from our priority list
      finalPayCurrency = currencyPriority.find(currency => 
        availableCurrencies.includes(currency)
      ) || availableCurrencies[0]; // Fallback to first available currency
      
      console.log(`Using alternative currency: ${finalPayCurrency}`);
    } else {
      // Use the exact case from available currencies
      finalPayCurrency = availableCurrencies.find((c: string) => 
        c.toLowerCase() === payCurrency.toLowerCase()
      ) || payCurrency;
    }

    // Check minimum amount with NOWPayments API first
    try {
      const minAmountRes = await fetch(`${baseUrl}/min-amount?currency_from=${priceCurrency}&currency_to=${finalPayCurrency}`, {
        headers: { "x-api-key": apiKey },
      });
      
      if (minAmountRes.ok) {
        const minAmountData = await minAmountRes.json();
        const minAmount = Math.max(parseFloat(minAmountData.min_amount || "20"), 20);
        console.log(`Minimum amount for ${priceCurrency} to ${finalPayCurrency}:`, minAmount);
        
        if (amount < minAmount) {
          return NextResponse.json({ 
            error: `Minimum amount is $${minAmount} USDT for ${finalPayCurrency}`,
            min_amount: minAmount,
            requested_amount: amount
          }, { status: 400 });
        }
      } else {
        console.warn("Failed to fetch minimum amount, using default validation");
        // Fallback to our hardcoded minimum
        if (amount < 20) {
          return NextResponse.json({ 
            error: "Minimum amount is $20 USDT for USDT TRC20",
            min_amount: 20,
            requested_amount: amount
          }, { status: 400 });
        }
      }
    } catch (minAmountError) {
      console.warn("Error checking minimum amount:", minAmountError);
      // Fallback validation
      if (amount < 20) {
        return NextResponse.json({ 
          error: "Minimum amount is $20 USDT for USDT TRC20",
          min_amount: 20,
          requested_amount: amount
        }, { status: 400 });
      }
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const originEnv = process.env.NEXT_PUBLIC_SITE_URL;
    const reqUrl = new URL(request.url);
    const origin = originEnv || `${reqUrl.protocol}//${reqUrl.host}`;

    // Try to get an estimate first to validate the currency pair
    try {
      const estimateRes = await fetch(`${baseUrl}/estimate?amount=${amount}&currency_from=${priceCurrency}&currency_to=${finalPayCurrency}`, {
        headers: { "x-api-key": apiKey },
      });
      
      if (estimateRes.ok) {
        const estimateData = await estimateRes.json();
        console.log("Currency estimate successful:", estimateData);
      } else {
        console.warn("Currency estimate failed:", estimateRes.status, await estimateRes.text());
        // Try with different currency formats if estimate fails
        if (finalPayCurrency.toLowerCase() === 'usdttrc20') {
          // Try alternative formats
          const alternatives = ['usdt', 'trx', 'btc'];
          for (const alt of alternatives) {
            const altEstimateRes = await fetch(`${baseUrl}/estimate?amount=${amount}&currency_from=${priceCurrency}&currency_to=${alt}`, {
              headers: { "x-api-key": apiKey },
            });
            if (altEstimateRes.ok) {
              finalPayCurrency = alt;
              console.log(`Using alternative currency: ${alt}`);
              break;
            }
          }
        }
      }
    } catch (estimateError) {
      console.warn("Estimate check failed:", estimateError);
      // Continue anyway - the invoice creation will give us the real error
    }

    const orderId = `dep_${Date.now()}`;

    const payload = {
      price_amount: amount,
      price_currency: priceCurrency,
      pay_currency: finalPayCurrency, // Use the available currency
      order_id: orderId,
      order_description: planId ? `Deposit for plan ${planId}` : "Wallet deposit",
      ipn_callback_url: `${origin}/api/nowpayments/webhook`,
      success_url: `${origin}/wallet?deposit=success&order_id=${orderId}`,
      cancel_url: `${origin}/wallet/deposit?cancelled=1&order_id=${orderId}`,
      // Add required fields for better compatibility
      is_fee_paid_by_user: false,
      is_fixed_rate: false,
    };

    console.log("NOWPayments API Request:", {
      url: `${baseUrl}/invoice`,
      payload,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey ? "[REDACTED]" : "[MISSING]",
      },
      availableCurrencies: availableCurrencies.length > 0 ? availableCurrencies.slice(0, 10) : "No currencies found",
      currencyMapping: {
        requested: payCurrency,
        final: finalPayCurrency,
        fallbackApplied: payCurrency !== finalPayCurrency
      }
    });

    const res = await fetch(`${baseUrl}/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("NOWPayments API Response:", {
      status: res.status,
      statusText: res.statusText,
      data,
    });

    if (!res.ok) {
      console.error("NOWPayments API Error:", {
        status: res.status,
        statusText: res.statusText,
        error: data,
      });
      
      // Provide more user-friendly error messages
      let userError = data?.message || `Payment service error (${res.status})`;
      if (data?.message?.includes('estimate')) {
        userError = "Currency conversion not available. Please try again or contact support.";
      } else if (data?.message?.includes('currency')) {
        userError = "The selected payment currency is not supported. Please try again.";
      } else if (data?.message?.includes('minimal') || data?.message?.includes('minimum')) {
        // Extract minimum amount from error message if possible
        const minMatch = data.message.match(/([0-9.]+)/);
        const suggestedMin = minMatch ? Math.max(parseFloat(minMatch[1]), 20) : 20;
        userError = `Minimum amount is $${Math.ceil(suggestedMin)} USDT. Please increase your deposit amount.`;
      } else if (res.status === 401) {
        userError = "Payment service authentication failed. Please contact support.";
      } else if (res.status >= 500) {
        userError = "Payment service is temporarily unavailable. Please try again later.";
      }
      
      return NextResponse.json({ 
        error: userError,
        details: data,
        status: res.status,
        statusText: res.statusText,
        troubleshooting: {
          currency_used: finalPayCurrency,
          currency_requested: payCurrency,
          fallback_applied: payCurrency !== finalPayCurrency
        }
      }, { status: res.status });
    }

    // Record a pending deposit using clean database service
    const deposit = await db.createDeposit(user.id, orderId, amount);
    if (!deposit) {
      // Non-fatal: return invoice anyway but include warning
      return NextResponse.json({ 
        invoice_url: data?.invoice_url, 
        id: data?.id, 
        warning: "Failed to persist pending deposit" 
      });
    }

    // Update deposit with NOWPayments data
    await db.updateDeposit(orderId, {
      nowpayments_data: { 
        invoice: data, 
        meta: { planId: planId || null },
        pay_currency: finalPayCurrency
      }
    });

    return NextResponse.json({ 
      invoice_url: data?.invoice_url, 
      id: data?.id, 
      data,
      currency_info: {
        requested: payCurrency,
        used: finalPayCurrency,
        fallback_applied: payCurrency !== finalPayCurrency
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
