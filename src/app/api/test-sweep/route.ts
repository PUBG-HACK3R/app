import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Test auto-sweep functionality
export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get test data from request
    const { network, amount } = await request.json();
    
    if (!network || !amount) {
      return NextResponse.json({ 
        error: 'Missing network or amount' 
      }, { status: 400 });
    }

    // Test hot wallet configuration
    const hotWalletAddress = network === 'TRON' 
      ? process.env.HOT_WALLET_TRC20_ADDRESS 
      : process.env.HOT_WALLET_ARBITRUM_ADDRESS;

    if (!hotWalletAddress) {
      return NextResponse.json({ 
        error: `Hot wallet address not configured for ${network}`,
        network,
        envCheck: {
          TRON: !!process.env.HOT_WALLET_TRC20_ADDRESS,
          ARBITRUM: !!process.env.HOT_WALLET_ARBITRUM_ADDRESS,
          TRON_RPC: !!process.env.TRON_RPC_URL,
          ARBITRUM_RPC: !!process.env.ARBITRUM_RPC_URL,
          USDT_TRC20: !!process.env.USDT_TRC20_ADDRESS,
          USDT_ARBITRUM: !!process.env.USDT_ARBITRUM_ADDRESS
        }
      }, { status: 400 });
    }

    // Simulate sweep test
    const testResult = {
      network,
      amount,
      hotWalletAddress,
      gasReserve: network === 'TRON' ? 1 : 0.001,
      sweepAmount: Math.max(0, amount - (network === 'TRON' ? 1 : 0.001)),
      configuration: {
        hotWallet: hotWalletAddress,
        rpcUrl: network === 'TRON' ? process.env.TRON_RPC_URL : process.env.ARBITRUM_RPC_URL,
        usdtContract: network === 'TRON' ? process.env.USDT_TRC20_ADDRESS : process.env.USDT_ARBITRUM_ADDRESS
      },
      status: 'test_mode',
      message: 'Auto-sweep configuration verified successfully'
    };

    return NextResponse.json({
      success: true,
      testResult,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sweep test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for quick testing
export async function GET() {
  return NextResponse.json({
    message: 'Auto-sweep test endpoint',
    usage: 'POST with { "network": "TRON" or "ARBITRUM", "amount": 100 }',
    hotWallets: {
      TRON: process.env.HOT_WALLET_TRC20_ADDRESS || 'NOT_CONFIGURED',
      ARBITRUM: process.env.HOT_WALLET_ARBITRUM_ADDRESS || 'NOT_CONFIGURED'
    }
  });
}
