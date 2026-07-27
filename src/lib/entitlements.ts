import { BookingStatus, EnrollmentStatus, ResourceAudience } from "@prisma/client";
import { prisma } from "./db";

/// Who may download what.
///
/// PUBLIC material is open — we ask for an email so we can follow up, but we
/// do not withhold the file. CONSULTATION and ENROLLED material needs proof,
/// which is the booking/enrolment reference plus the email it was made with.
/// That pair is the same thing the learner sees on their confirmation page.

export type Entitlement = {
  consultation: boolean;
  /// Program ids the person has a confirmed enrolment in.
  enrolledProgramIds: string[];
};

export const NO_ENTITLEMENT: Entitlement = { consultation: false, enrolledProgramIds: [] };

/// Resolve what a (reference, email) pair unlocks. Both must match the same
/// record, so a leaked reference alone is not enough.
export async function entitlementsFor(
  reference: string | undefined,
  email: string | undefined,
): Promise<Entitlement> {
  if (!reference || !email) return NO_ENTITLEMENT;
  const normalisedEmail = email.trim().toLowerCase();

  if (reference.startsWith("CON-")) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { reference },
      include: { person: { select: { email: true } } },
    });
    const confirmed =
      booking?.person.email === normalisedEmail &&
      (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED);
    return confirmed ? { consultation: true, enrolledProgramIds: [] } : NO_ENTITLEMENT;
  }

  if (reference.startsWith("ENR-")) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { reference },
      include: {
        person: { select: { email: true } },
        cohort: { select: { programId: true } },
      },
    });
    const confirmed =
      enrollment?.person.email === normalisedEmail &&
      (enrollment.status === EnrollmentStatus.CONFIRMED ||
        enrollment.status === EnrollmentStatus.COMPLETED);
    // A paid learner also gets the consultation-tier material.
    return confirmed
      ? { consultation: true, enrolledProgramIds: [enrollment.cohort.programId] }
      : NO_ENTITLEMENT;
  }

  return NO_ENTITLEMENT;
}

export function canDownload(
  resource: { audience: ResourceAudience; programId: string | null },
  entitlement: Entitlement,
): boolean {
  switch (resource.audience) {
    case ResourceAudience.PUBLIC:
      return true;
    case ResourceAudience.CONSULTATION:
      return entitlement.consultation;
    case ResourceAudience.ENROLLED:
      // Material tied to a specific programme needs an enrolment in that
      // programme; untied material needs any enrolment at all.
      return resource.programId
        ? entitlement.enrolledProgramIds.includes(resource.programId)
        : entitlement.enrolledProgramIds.length > 0;
  }
}
