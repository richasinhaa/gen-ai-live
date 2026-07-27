/// Single place for brand copy and outbound links, so the footer, metadata and
/// share cards never drift apart.

export const site = {
  name: "Gen AI Live",
  tagline: "Live, small-group generative AI training",
  description:
    "Live cohorts on RAG, agent development and applied generative AI research — plus one-on-one consultations to work out where you should start.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@genailive.in",
  timezone: "Asia/Kolkata",
  timezoneLabel: "IST",
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com",
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com",
  },
} as const;

export const PROGRAM_SLUGS = {
  consultation: "consultation",
  researchCohort: "research-cohort",
  ecosystemBatch: "genai-ecosystem",
} as const;
