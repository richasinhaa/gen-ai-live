import { NextResponse } from "next/server";
import { PaymentPurpose, SlotStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bookingSchema, fieldErrors } from "@/lib/validation";
import { buildIntakeNotes, upsertPerson } from "@/lib/intake";
import { makeReference } from "@/lib/reference";
import { createOrder, isRazorpayConfigured } from "@/lib/razorpay";
import { releaseExpiredHolds } from "@/lib/payments";
import { SLOT_HOLD_MINUTES } from "@/lib/slots";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { PROGRAM_SLUGS } from "@/lib/site";

/// Books a consultation slot and opens a Razorpay order for it.
///
/// The slot is moved to HELD inside a conditional update, so two people
/// clicking the same slot at the same moment cannot both get it — the second
/// update matches zero rows and that request is told to pick again.
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "book"), { limit: 8, windowMs: 10 * 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Please email us to book." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const intake = parsed.data;

  await releaseExpiredHolds();

  const program = await prisma.program.findUnique({
    where: { slug: PROGRAM_SLUGS.consultation },
  });
  if (!program) {
    return NextResponse.json({ error: "Consultation is unavailable" }, { status: 503 });
  }

  const slot = await prisma.availabilitySlot.findUnique({ where: { id: intake.slotId } });
  if (!slot || slot.status !== SlotStatus.OPEN) {
    return NextResponse.json(
      { error: "That slot was just taken. Pick another one.", fields: { slotId: "No longer available" } },
      { status: 409 },
    );
  }
  if (slot.startsAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "That slot has already started. Pick another one.", fields: { slotId: "In the past" } },
      { status: 409 },
    );
  }

  const heldUntil = new Date(Date.now() + SLOT_HOLD_MINUTES * 60_000);
  const claimed = await prisma.availabilitySlot.updateMany({
    where: { id: slot.id, status: SlotStatus.OPEN },
    data: { status: SlotStatus.HELD, heldUntil },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "That slot was just taken. Pick another one.", fields: { slotId: "No longer available" } },
      { status: 409 },
    );
  }

  try {
    const person = await upsertPerson(intake);
    const reference = makeReference("CON");

    const booking = await prisma.consultationBooking.create({
      data: {
        reference,
        personId: person.id,
        slotId: slot.id,
        amountPaise: program.priceInPaise,
        intakeNotes: buildIntakeNotes(intake),
      },
    });

    const order = await createOrder({
      amountPaise: program.priceInPaise,
      receipt: reference,
      notes: { purpose: "consultation", reference, email: person.email },
    });

    await prisma.payment.create({
      data: {
        personId: person.id,
        purpose: PaymentPurpose.CONSULTATION,
        amountPaise: program.priceInPaise,
        razorpayOrderId: order.id,
        bookingId: booking.id,
      },
    });

    return NextResponse.json({
      reference,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
      prefill: { name: person.fullName, email: person.email, contact: person.phone ?? "" },
    });
  } catch (error) {
    // Never strand a slot in HELD because order creation blew up.
    await prisma.availabilitySlot.updateMany({
      where: { id: slot.id, status: SlotStatus.HELD },
      data: { status: SlotStatus.OPEN, heldUntil: null },
    });
    console.error("consultation booking failed", error);
    return NextResponse.json(
      { error: "We could not start the payment. Nothing was charged — please try again." },
      { status: 500 },
    );
  }
}
