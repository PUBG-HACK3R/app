import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Test if the webhook endpoint is accessible
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://weearn-web3.vercel.app'}/api/nowpayments/webhook`;
    
    return NextResponse.json({
      success: true,
      webhookUrl,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      ipnSecretConfigured: !!process.env.NOWPAYMENTS_IPN_SECRET,
      apiKeyConfigured: !!process.env.NOWPAYMENTS_API_KEY,
      recommendations: [
        "Make sure webhook URL is configured in NOWPayments dashboard:",
        webhookUrl,
        "",
        "Environment variables needed:",
        `NOWPAYMENTS_IPN_SECRET: ${process.env.NOWPAYMENTS_IPN_SECRET ? 'Configured ✅' : 'Missing ❌'}`,
        `NOWPAYMENTS_API_KEY: ${process.env.NOWPAYMENTS_API_KEY ? 'Configured ✅' : 'Missing ❌'}`,
        `NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'Missing - should be https://weearn-web3.vercel.app'}`
      ]
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
