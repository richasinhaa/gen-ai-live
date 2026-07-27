import { BookingStatus, EnrollmentStatus } from "@prisma/client";
import { prisma } from "./db";

/// Loads whatever a reference points at — a consultation booking or a cohort
/// enrolment — in the shape the confirmation page renders.

export type BookingRecord = NonNullable<Awaited<ReturnType<typeof findBooking>>>;
export type EnrollmentRecord = NonNullable<Awaited<ReturnType<typeof findEnrollment>>>;

export function findBooking(reference: string) {
  return prisma.consultationBooking.findUnique({
    where: { reference },
    include: { person: true, slot: true },
  });
}

export function findEnrollment(reference: string) {
  return prisma.enrollment.findUnique({
    where: { reference },
    include: {
      person: true,
      cohort: { include: { program: true, sessions: { orderBy: { sequence: "asc" } } } },
    },
  });
}

export function isBookingConfirmed(status: BookingStatus): boolean {
  return status === BookingStatus.CONFIRMED || status === BookingStatus.COMPLETED;
}

export function isEnrollmentConfirmed(status: EnrollmentStatus): boolean {
  return status === EnrollmentStatus.CONFIRMED || status === EnrollmentStatus.COMPLETED;
}
