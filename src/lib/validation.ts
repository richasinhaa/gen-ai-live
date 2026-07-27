import { z } from "zod";

/// Shared intake shape. The same profile drives both the consultation brief and
/// the cohort roster, so it is captured once and reused.

export const CODING_COMFORT = ["NONE", "BASIC", "COMFORTABLE", "ADVANCED"] as const;
export const AI_EXPOSURE = ["NONE", "PROMPTING", "BUILT_PROTOTYPES", "IN_PRODUCTION"] as const;
export const REFERRAL_SOURCES = [
  "instagram",
  "linkedin",
  "referral",
  "search",
  "other",
] as const;

export const CODING_COMFORT_LABELS: Record<(typeof CODING_COMFORT)[number], string> = {
  NONE: "I don't code",
  BASIC: "I can read code / script a little",
  COMFORTABLE: "I write code regularly",
  ADVANCED: "I ship production systems",
};

export const AI_EXPOSURE_LABELS: Record<(typeof AI_EXPOSURE)[number], string> = {
  NONE: "Haven't really started",
  PROMPTING: "I use ChatGPT/Claude regularly",
  BUILT_PROTOTYPES: "I've built prototypes with an LLM API",
  IN_PRODUCTION: "I run LLM features in production",
};

export const REFERRAL_LABELS: Record<(typeof REFERRAL_SOURCES)[number], string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  referral: "A friend or colleague",
  search: "Search",
  other: "Somewhere else",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const intakeSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(120),
  email: z.string().trim().toLowerCase().email("That email doesn't look right").max(200),
  // Deliberately permissive: learners paste +91, spaces, hyphens and country
  // codes in every combination. We only need it to be dialable by a human.
  phone: z
    .string()
    .trim()
    .min(7, "Add a phone number we can reach you on")
    .max(20)
    .regex(/^[+]?[\d\s-]+$/, "Digits, spaces and + only"),
  city: optionalText(80),
  linkedin: z
    .string()
    .trim()
    .url("Paste the full LinkedIn URL")
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: optionalText(120),
  organisation: optionalText(120),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  codingComfort: z.enum(CODING_COMFORT),
  aiExposure: z.enum(AI_EXPOSURE),
  goal: z
    .string()
    .trim()
    .min(10, "A sentence or two helps us prepare")
    .max(2000),
  referredBy: z.enum(REFERRAL_SOURCES).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please accept the terms to continue" }),
  }),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export const bookingSchema = intakeSchema.extend({
  slotId: z.string().trim().min(1, "Pick a slot"),
});

export const enrollmentSchema = intakeSchema.extend({
  cohortId: z.string().trim().min(1, "Pick a cohort"),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: optionalText(120),
  interest: optionalText(80),
  source: optionalText(40),
});

export const downloadSchema = z.object({
  resourceSlug: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email("We need an email to send updates to").max(200),
  name: optionalText(120),
  /// Booking/enrolment reference. Required for gated material — it is the
  /// proof that this email is entitled to the file.
  reference: optionalText(20),
});

/// Flatten a ZodError into `{ field: message }` for the form UIs.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
