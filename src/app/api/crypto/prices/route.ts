import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the prices for 30 seconds to avoid hitting rate limits
let priceCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function GET() {
  try {
    // Check if we have cached data that's still fresh
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(priceCache.data);
    }

    // Fetch live prices from CoinGecko
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin&vs_currencies=usd&include_24hr_change=true",
      {
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 30 seconds
        next: { revalidate: 30 }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform the data to match our expected format
    const transformedData = {
      bitcoin: {
        name: "Bitcoin",
        symbol: "BTC",
        price: data.bitcoin?.usd || 0,
        change: data.bitcoin?.usd_24h_change || 0,
        formatted_price: `$${(data.bitcoin?.usd || 0).toLocaleString()}`,
        formatted_change: `${(data.bitcoin?.usd_24h_change || 0) >= 0 ? '+' : ''}${(data.bitcoin?.usd_24h_change || 0).toFixed(2)}%`
      },
      ethereum: {
        name: "Ethereum",
        symbol: "ETH",
        price: data.ethereum?.usd || 0,
        change: data.ethereum?.usd_24h_change || 0,
        formatted_price: `$${(data.ethereum?.usd || 0).toLocaleString()}`,
        formatted_change: `${(data.ethereum?.usd_24h_change || 0) >= 0 ? '+' : ''}${(data.ethereum?.usd_24h_change || 0).toFixed(2)}%`
      },
      tether: {
        name: "USDT",
        symbol: "USDT",
        price: data.tether?.usd || 1,
        change: data.tether?.usd_24h_change || 0,
        formatted_price: `$${(data.tether?.usd || 1).toFixed(3)}`,
        formatted_change: `${(data.tether?.usd_24h_change || 0) >= 0 ? '+' : ''}${(data.tether?.usd_24h_change || 0).toFixed(3)}%`
      },
      binancecoin: {
        name: "BNB",
        symbol: "BNB",
        price: data.binancecoin?.usd || 0,
        change: data.binancecoin?.usd_24h_change || 0,
        formatted_price: `$${(data.binancecoin?.usd || 0).toLocaleString()}`,
        formatted_change: `${(data.binancecoin?.usd_24h_change || 0) >= 0 ? '+' : ''}${(data.binancecoin?.usd_24h_change || 0).toFixed(2)}%`
      }
    };

    // Update cache
    priceCache = {
      data: transformedData,
      timestamp: Date.now()
    };

    return NextResponse.json(transformedData);

  } catch (error: any) {
    console.error("Error fetching crypto prices:", error);
    
    // Return fallback data if API fails
    const fallbackData = {
      bitcoin: {
        name: "Bitcoin",
        symbol: "BTC",
        price: 43250,
        change: 2.4,
        formatted_price: "$43,250",
        formatted_change: "+2.4%"
      },
      ethereum: {
        name: "Ethereum",
        symbol: "ETH",
        price: 2580,
        change: 1.8,
        formatted_price: "$2,580",
        formatted_change: "+1.8%"
      },
      tether: {
        name: "USDT",
        symbol: "USDT",
        price: 1.000,
        change: 0.0,
        formatted_price: "$1.000",
        formatted_change: "0.0%"
      },
      binancecoin: {
        name: "BNB",
        symbol: "BNB",
        price: 315,
        change: 3.2,
        formatted_price: "$315",
        formatted_change: "+3.2%"
      }
    };

    return NextResponse.json(fallbackData, { status: 200 });
  }
}
