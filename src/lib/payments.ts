import {
  BookingStatus,
  EnrollmentStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  SlotStatus,
} from "@prisma/client";
import { prisma } from "./db";

/// Confirming a payment is called from two places that race each other: the
/// browser returning from Razorpay Checkout, and Razorpay's webhook (which
/// retries). Both funnel through here, and it is idempotent — the first caller
/// flips the records, the rest are no-ops.
export async function confirmPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature?: string;
  payload?: Prisma.InputJsonValue;
}): Promise<{ ok: true; alreadyProcessed: boolean } | { ok: false; reason: string }> {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
  });

  if (!payment) return { ok: false, reason: "unknown_order" };
  if (payment.status === PaymentStatus.PAID) return { ok: true, alreadyProcessed: true };
  if (payment.status === PaymentStatus.REFUNDED) return { ok: false, reason: "already_refunded" };

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.signature,
        rawPayload: params.payload,
        paidAt: new Date(),
      },
    });

    if (payment.purpose === PaymentPurpose.CONSULTATION && payment.bookingId) {
      const booking = await tx.consultationBooking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });
      // The slot was HELD during checkout; money makes it permanent.
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { status: SlotStatus.BOOKED, heldUntil: null },
      });
    }

    if (payment.purpose === PaymentPurpose.ENROLLMENT && payment.enrollmentId) {
      await tx.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: EnrollmentStatus.CONFIRMED },
      });
    }
  });

  return { ok: true, alreadyProcessed: false };
}

export async function failPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  reason?: string;
  payload?: Prisma.InputJsonValue;
}): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
  });
  // A failure notice must never undo a capture that already landed.
  if (!payment || payment.status === PaymentStatus.PAID) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      razorpayPaymentId: params.razorpayPaymentId ?? payment.razorpayPaymentId,
      failureReason: params.reason,
      rawPayload: params.payload,
    },
  });

  // Release the slot immediately rather than waiting for the hold to lapse —
  // a failed payment usually means the learner is about to retry.
  if (payment.purpose === PaymentPurpose.CONSULTATION && payment.bookingId) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: payment.bookingId },
      select: { id: true, slotId: true, status: true },
    });
    if (booking && booking.status === BookingStatus.PENDING_PAYMENT) {
      await prisma.$transaction([
        prisma.consultationBooking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
        }),
        prisma.availabilitySlot.updateMany({
          where: { id: booking.slotId, status: SlotStatus.HELD },
          data: { status: SlotStatus.OPEN, heldUntil: null },
        }),
      ]);
    }
  }

  // Enrolments are deliberately left PENDING_PAYMENT on failure: (person,
  // cohort) is unique, so the retry reuses the same row rather than needing a
  // new one. Seats are only counted against CONFIRMED enrolments.
}

/// Sweeps abandoned checkouts back into the pool: expired holds return to OPEN
/// and the bookings behind them are cancelled. Called opportunistically
/// whenever availability is read, which keeps the slot grid honest without
/// needing a cron job.
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date();
  const expired = await prisma.availabilitySlot.findMany({
    where: { status: SlotStatus.HELD, heldUntil: { lt: now } },
    select: { id: true },
  });
  if (expired.length === 0) return 0;

  const slotIds = expired.map((slot) => slot.id);
  const [, released] = await prisma.$transaction([
    prisma.consultationBooking.updateMany({
      where: { slotId: { in: slotIds }, status: BookingStatus.PENDING_PAYMENT },
      data: { status: BookingStatus.CANCELLED, cancelledAt: now },
    }),
    prisma.availabilitySlot.updateMany({
      where: { id: { in: slotIds }, status: SlotStatus.HELD, heldUntil: { lt: now } },
      data: { status: SlotStatus.OPEN, heldUntil: null },
    }),
  ]);
  return released.count;
}
