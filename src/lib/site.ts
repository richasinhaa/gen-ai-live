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
    linkedin:
      process.env.NEXT_PUBLIC_LINKEDIN_URL ??
      "https://www.linkedin.com/in/richa-sinha-a600b618/",
  },
} as const;

/// Who runs the programmes.
///
/// `bio` is rendered only when it is non-empty — deliberately, so nothing
/// invented ships under a real person's name. Write two or three sentences in
/// your own words: what you build, who you have taught, why you run these
/// live. That paragraph does more for conversion than anything else on the
/// page, and it is the one thing that cannot be written for you.
export const founder = {
  name: "Richa Sinha",
  role: "Founder",
  linkedin: "https://www.linkedin.com/in/richa-sinha-a600b618/",
  bio: "",
} as const;

export const PROGRAM_SLUGS = {
  consultation: "consultation",
  researchCohort: "research-cohort",
  ecosystemBatch: "genai-ecosystem",
} as const;
