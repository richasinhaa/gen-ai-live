import { NextResponse } from "next/server";
import { PaymentPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyPaymentSchema } from "@/lib/validation";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { confirmPayment, failPayment } from "@/lib/payments";

/// Called by the browser the moment Razorpay Checkout succeeds, so the learner
/// sees their confirmation immediately instead of waiting on the webhook.
///
/// The signature is verified server-side — a client claiming success proves
/// nothing. The webhook still arrives later and is the authoritative record;
/// both paths are idempotent.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed payment response" }, { status: 400 });
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = parsed.data;

  if (!verifyCheckoutSignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    signature,
  })) {
    await failPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      reason: "checkout_signature_mismatch",
    });
    return NextResponse.json({ error: "Payment could not be verified" }, { status: 400 });
  }

  const result = await confirmPayment({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    signature,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "We could not match that payment. Email us and we'll sort it out." },
      { status: 409 },
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId },
    include: {
      booking: { select: { reference: true } },
      enrollment: { select: { reference: true } },
    },
  });

  const reference =
    payment?.purpose === PaymentPurpose.CONSULTATION
      ? payment.booking?.reference
      : payment?.enrollment?.reference;

  return NextResponse.json({
    ok: true,
    reference,
    redirectTo: reference ? `/confirmation/${reference}` : "/",
  });
}
