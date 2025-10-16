import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/database/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sortKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      }, {} as Record<string, any>);
  }
  return obj;
}

function canonicalJson(obj: any) {
  return JSON.stringify(sortKeys(obj));
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const headerSig = request.headers.get("x-nowpayments-sig") || "";

    let parsed: any;
    try {
      parsed = JSON.parse(raw || "{}");
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify NOWPayments signature
    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "IPN secret not configured" }, { status: 500 });
    }

    const message = canonicalJson(parsed);
    const hmac = createHmac("sha512", String(secret)).update(message).digest("hex");

    // Compare signatures in a timing-safe way
    const ok = headerSig && hmac.length === headerSig.length && 
               timingSafeEqual(Buffer.from(hmac), Buffer.from(headerSig));
    
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const orderId: string | undefined = parsed?.order_id;
    const paymentStatus: string | undefined = parsed?.payment_status;
    const paymentId: string | undefined = parsed?.payment_id;
    const txHash: string | undefined = parsed?.payin_hash || parsed?.transaction_id;

    if (!orderId) {
      return NextResponse.json({ 
        received: true, 
        note: "No order_id in payload" 
      });
    }

    // Get existing deposit
    const deposit = await db.getDepositByOrderId(orderId);
    if (!deposit) {
      return NextResponse.json({ 
        received: true, 
        note: "Deposit not found" 
      });
    }

    // Update deposit with webhook data
    const webhookData = {
      ...deposit.nowpayments_data,
      webhook: parsed
    };

    await db.updateDeposit(orderId, {
      status: paymentStatus as any || 'pending',
      payment_id: paymentId,
      tx_hash: txHash,
      nowpayments_data: webhookData
    });

    // If payment is confirmed, process the deposit
    const successStatuses = ["finished", "confirmed", "completed", "succeeded"];
    if (paymentStatus && successStatuses.includes(paymentStatus.toLowerCase())) {
      console.log(`🔄 Processing deposit confirmation for ${orderId} with status: ${paymentStatus}`);
      
      try {
        // Confirm deposit (this handles balance updates, referral commissions, etc.)
        const confirmed = await db.confirmDeposit(orderId, paymentId, txHash);
        
        if (confirmed) {
          console.log(`✅ Deposit ${orderId} confirmed successfully`);
        } else {
          console.error(`❌ Failed to confirm deposit ${orderId} - confirmDeposit returned false`);
          
          // Get deposit details for debugging
          const deposit = await db.getDepositByOrderId(orderId);
          console.error(`🔍 Deposit details:`, {
            found: !!deposit,
            status: deposit?.status,
            user_id: deposit?.user_id,
            amount: deposit?.amount_usdt
          });
        }
      } catch (error) {
        console.error(`❌ Exception in confirmDeposit for ${orderId}:`, error);
      }
    } else {
      console.log(`⏳ Deposit ${orderId} status: ${paymentStatus} (not processing)`);
    }

    return NextResponse.json({ 
      received: true, 
      order_id: orderId, 
      status: paymentStatus 
    });

  } catch (err: any) {
    console.error("NOWPayments webhook error:", err);
    return NextResponse.json({ 
      error: err.message || "Unexpected error" 
    }, { status: 500 });
  }
}
