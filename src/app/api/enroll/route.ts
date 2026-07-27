import { NextResponse } from "next/server";
import { CohortStatus, EnrollmentStatus, PaymentPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrollmentSchema, fieldErrors } from "@/lib/validation";
import { buildIntakeNotes, upsertPerson } from "@/lib/intake";
import { makeReference } from "@/lib/reference";
import { createOrder, isRazorpayConfigured } from "@/lib/razorpay";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/// Enrols a person in a cohort and opens a Razorpay order.
///
/// Seats are checked against CONFIRMED enrolments only — a pending checkout
/// does not consume a seat, so an abandoned one never silently shrinks the
/// cohort. Slight oversell risk at the very last seat is accepted; the
/// alternative (holding seats for 15 minutes) hurts a 16-seat cohort more.
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "enroll"), { limit: 8, windowMs: 10 * 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Please email us to enrol." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = enrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const intake = parsed.data;

  const cohort = await prisma.cohort.findUnique({
    where: { id: intake.cohortId },
    include: { program: true },
  });
  if (!cohort || cohort.status !== CohortStatus.OPEN) {
    return NextResponse.json(
      { error: "That cohort is not open for enrolment.", fields: { cohortId: "Not available" } },
      { status: 409 },
    );
  }

  const person = await upsertPerson(intake);

  const existing = await prisma.enrollment.findUnique({
    where: { personId_cohortId: { personId: person.id, cohortId: cohort.id } },
  });
  if (existing && existing.status === EnrollmentStatus.CONFIRMED) {
    return NextResponse.json(
      { error: "You are already enrolled in this cohort.", reference: existing.reference },
      { status: 409 },
    );
  }

  const confirmedSeats = await prisma.enrollment.count({
    where: { cohortId: cohort.id, status: EnrollmentStatus.CONFIRMED },
  });
  if (confirmedSeats >= cohort.seats) {
    return NextResponse.json(
      { error: "This cohort is full. Join the list and we'll hold you a seat in the next one." },
      { status: 409 },
    );
  }

  try {
    const enrollment = existing
      ? await prisma.enrollment.update({
          where: { id: existing.id },
          data: {
            status: EnrollmentStatus.PENDING_PAYMENT,
            amountPaise: cohort.program.priceInPaise,
            intakeNotes: buildIntakeNotes(intake),
            cancelledAt: null,
          },
        })
      : await prisma.enrollment.create({
          data: {
            reference: makeReference("ENR"),
            personId: person.id,
            cohortId: cohort.id,
            amountPaise: cohort.program.priceInPaise,
            intakeNotes: buildIntakeNotes(intake),
          },
        });

    const order = await createOrder({
      amountPaise: cohort.program.priceInPaise,
      receipt: enrollment.reference,
      notes: {
        purpose: "enrollment",
        reference: enrollment.reference,
        cohort: cohort.code,
        email: person.email,
      },
    });

    await prisma.payment.create({
      data: {
        personId: person.id,
        purpose: PaymentPurpose.ENROLLMENT,
        amountPaise: cohort.program.priceInPaise,
        razorpayOrderId: order.id,
        enrollmentId: enrollment.id,
      },
    });

    return NextResponse.json({
      reference: enrollment.reference,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
      prefill: { name: person.fullName, email: person.email, contact: person.phone ?? "" },
    });
  } catch (error) {
    console.error("enrollment failed", error);
    return NextResponse.json(
      { error: "We could not start the payment. Nothing was charged — please try again." },
      { status: 500 },
    );
  }
}
