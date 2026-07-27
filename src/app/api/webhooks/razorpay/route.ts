import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmPayment, failPayment } from "@/lib/payments";

/// Razorpay webhook — the authoritative record of what was actually captured.
///
/// Point Dashboard > Webhooks at <site>/api/webhooks/razorpay and subscribe to
/// `payment.captured` and `payment.failed`.
///
/// Razorpay retries on any non-2xx, so this must be idempotent and must return
/// 200 for anything it has deliberately decided not to act on. Only genuine
/// server faults return 5xx, because those are worth retrying.

export const dynamic = "force-dynamic";

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  error_description?: string;
  error_reason?: string;
};

export async function POST(request: Request) {
  // The HMAC is computed over the exact bytes Razorpay sent — parse only after
  // the signature checks out, never re-serialise before verifying.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: string;
    payload?: { payment?: { entity?: RazorpayPaymentEntity } };
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const event = body.event ?? "unknown";
  const entity = body.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;

  // Razorpay's delivery id is the natural idempotency key; fall back to the
  // payment id and event name when the header is absent.
  const eventId =
    request.headers.get("x-razorpay-event-id") ?? `${event}:${paymentId ?? orderId ?? "none"}`;

  const alreadySeen = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (alreadySeen) return NextResponse.json({ ok: true, deduped: true });

  const payload = JSON.parse(rawBody) as Prisma.InputJsonValue;

  try {
    if (orderId && paymentId) {
      if (event === "payment.captured") {
        await confirmPayment({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, payload });
      } else if (event === "payment.failed") {
        await failPayment({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          reason: entity?.error_description ?? entity?.error_reason ?? "payment_failed",
          payload,
        });
      }
    }

    await prisma.webhookEvent.create({ data: { eventId, event, payload } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Do not record the event id — let Razorpay retry into a working server.
    console.error("razorpay webhook failed", { event, orderId, error });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
