import { prisma } from "./db";
import {
  AI_EXPOSURE_LABELS,
  CODING_COMFORT_LABELS,
  REFERRAL_LABELS,
  type IntakeInput,
} from "./validation";

/// People are keyed on email. A returning learner keeps one Person row, and the
/// latest intake overwrites the profile — but only with values they actually
/// supplied, so a sparse second form never blanks out a rich first one.
export async function upsertPerson(intake: IntakeInput) {
  const profile = {
    fullName: intake.fullName,
    phone: intake.phone,
    city: intake.city,
    linkedin: intake.linkedin,
    role: intake.role,
    organisation: intake.organisation,
    experienceYear: intake.experienceYears,
    codingComfort: intake.codingComfort,
    aiExposure: intake.aiExposure,
    goal: intake.goal,
    referredBy: intake.referredBy,
  };

  const defined = Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined && value !== ""),
  );

  return prisma.person.upsert({
    where: { email: intake.email },
    create: { email: intake.email, ...profile },
    update: defined,
  });
}

/// A readable snapshot of the intake, stored on the booking/enrolment so the
/// instructor's prep notes stay pinned to what was true at the time.
export function buildIntakeNotes(intake: IntakeInput): string {
  const lines = [
    `Role: ${intake.role ?? "—"}${intake.organisation ? ` at ${intake.organisation}` : ""}`,
    `Experience: ${intake.experienceYears ?? "—"} years`,
    `Coding: ${CODING_COMFORT_LABELS[intake.codingComfort]}`,
    `AI exposure: ${AI_EXPOSURE_LABELS[intake.aiExposure]}`,
    intake.city ? `Based in: ${intake.city}` : null,
    intake.linkedin ? `LinkedIn: ${intake.linkedin}` : null,
    intake.referredBy ? `Found us via: ${REFERRAL_LABELS[intake.referredBy]}` : null,
    "",
    "Goal:",
    intake.goal,
  ];
  return lines.filter((line) => line !== null).join("\n");
}
