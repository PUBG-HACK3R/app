import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "IPN secret not configured" }, { status: 500 });
    }

    const message = canonicalJson(parsed);
    const hmac = createHmac("sha512", String(secret)).update(message).digest("hex");

    // compare signatures in a timing-safe way
    const ok = headerSig && hmac.length === headerSig.length && timingSafeEqual(Buffer.from(hmac), Buffer.from(headerSig));
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const orderId: string | undefined = parsed?.order_id;
    const paymentStatus: string | undefined = parsed?.payment_status;
    const txHash: string | undefined = parsed?.payment_id || parsed?.transaction_id || parsed?.payin_hash;

    if (!orderId) {
      return NextResponse.json({ received: true, note: "no order_id in payload" });
    }

    // Fetch existing deposit to merge raw safely
    const { data: existingDeposit, error: fetchErr } = await admin
      .from("deposits")
      .select("id,user_id,amount_usdt,raw")
      .eq("order_id", orderId)
      .single();
    if (fetchErr || !existingDeposit) {
      return NextResponse.json({ received: true, note: "deposit not found", error: fetchErr?.message });
    }

    const currentRaw = (existingDeposit as any).raw || {};
    const mergedRaw = { ...currentRaw, webhook: parsed };

    // Update deposit by order_id; store merged raw payload
    const { data: deposit, error: depErr } = await admin
      .from("deposits")
      .update({ status: paymentStatus || "unknown", tx_hash: txHash, raw: mergedRaw })
      .eq("order_id", orderId)
      .select("id,user_id,amount_usdt,raw")
      .single();

    if (depErr) {
      // If no deposit was found, ignore but still ack
      return NextResponse.json({ received: true, note: "deposit not found", error: depErr.message });
    }

    // If payment is confirmed/finished, record a transaction of type 'deposit' (idempotent)
    const successStatuses = new Set(["finished", "confirmed", "completed", "succeeded"]);
    if (paymentStatus && successStatuses.has(paymentStatus.toLowerCase())) {
      // Check if a deposit transaction already exists for this deposit
      const { data: existingTx, error: existingErr } = await admin
        .from("transactions")
        .select("id")
        .eq("type", "deposit")
        .eq("reference_id", deposit.id)
        .maybeSingle();

      if (!existingTx && !existingErr) {
        const { error: insErr } = await admin.from("transactions").insert({
          user_id: deposit.user_id,
          type: "deposit",
          amount_usdt: deposit.amount_usdt,
          reference_id: deposit.id,
          meta: { order_id: orderId, payment_status: paymentStatus, txHash },
        });
        if (!insErr) {
          // Update balances cache: increment available_usdt
          // Read current balance; upsert if missing
          const { data: balRow } = await admin
            .from("balances")
            .select("available_usdt")
            .eq("user_id", deposit.user_id)
            .maybeSingle();
          if (!balRow) {
            await admin.from("balances").insert({
              user_id: deposit.user_id,
              available_usdt: deposit.amount_usdt,
            });
          } else {
            const newBal = Number(balRow.available_usdt || 0) + Number(deposit.amount_usdt || 0);
            await admin
              .from("balances")
              .update({ available_usdt: newBal })
              .eq("user_id", deposit.user_id);
          }
        }

        // Create subscription once if a planId was provided at invoice time
        const planIdFromMeta: string | undefined = (deposit as any)?.raw?.meta?.planId || (currentRaw as any)?.meta?.planId;
        const subscriptionCreated: boolean | undefined = (deposit as any)?.raw?.meta?.subscriptionCreated;
        if (planIdFromMeta && !subscriptionCreated) {
          // Map plan slug to details
          const planMap: Record<string, { name: string; price: number; roi: number; days: number }> = {
            starter: { name: "Starter", price: 50, roi: 1.0, days: 30 },
            pro: { name: "Pro", price: 200, roi: 1.2, days: 45 },
            elite: { name: "Elite", price: 500, roi: 1.5, days: 60 },
          };
          const details = planMap[planIdFromMeta as keyof typeof planMap];
          if (details) {
            // Ensure a matching plan row exists (by name/price/roi), otherwise create
            const { data: existingPlan } = await admin
              .from("plans")
              .select("id")
              .eq("name", details.name)
              .maybeSingle();
            let planRowId = existingPlan?.id as string | undefined;
            if (!planRowId) {
              const { data: newPlan } = await admin
                .from("plans")
                .insert({
                  name: details.name,
                  price_usdt: details.price,
                  roi_daily_percent: details.roi,
                  duration_days: details.days,
                  is_active: true,
                })
                .select("id")
                .single();
              planRowId = newPlan?.id as string | undefined;
            }

            if (planRowId) {
              const now = new Date();
              const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
              const endDate = new Date(startDate);
              endDate.setUTCDate(endDate.getUTCDate() + details.days);
              const nextEarningAt = new Date(startDate);
              nextEarningAt.setUTCDate(nextEarningAt.getUTCDate() + 1);

              await admin.from("subscriptions").insert({
                user_id: deposit.user_id,
                plan_id: planRowId,
                principal_usdt: details.price,
                roi_daily_percent: details.roi,
                start_date: startDate.toISOString().slice(0, 10),
                end_date: endDate.toISOString().slice(0, 10),
                active: true,
                next_earning_at: nextEarningAt.toISOString(),
              });

              // Mark subscriptionCreated in deposit.raw.meta for idempotency
              const updatedRaw = { ...(deposit as any).raw, meta: { ...((deposit as any).raw?.meta || {}), subscriptionCreated: true } };
              await admin
                .from("deposits")
                .update({ raw: updatedRaw })
                .eq("id", deposit.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true, order_id: orderId, status: paymentStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
