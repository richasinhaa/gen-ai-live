/// Seeds the catalogue, the weekend consultation grid, and the downloadable
/// material — and, on a genuinely empty database, one starting cohort per
/// track.
///
/// This runs on every deploy, so it is built to be boring the second time:
///
///   - Programmes and resources are upserted on a stable key, so the catalogue
///     self-heals if a row is ever lost.
///   - Availability is topped up to four weekends out. Slots are unique on
///     their start instant, so this only ever fills gaps — a deploy quietly
///     keeps the booking grid stocked.
///   - Cohorts are created ONLY when a programme has none at all. Once one
///     exists, the seed does not touch cohorts or their sessions again: dates
///     are the instructor's to move from /admin, and people have those sessions
///     in their calendars.
///
/// The consequence worth stating: this will not invent a new cohort every 45
/// days for you. That is a scheduling decision, made in the console.

import { PrismaClient, ProgramKind, CohortStatus, ResourceAudience } from "@prisma/client";
import { generateWeekendSlots, SLOT_DURATION_MIN, istParts } from "../src/lib/slots";

const prisma = new PrismaClient();

/// Next occurrence of a weekday (0=Sun) at a given IST hour, `minDaysAway` out.
function nextWeekend(minDaysAway: number, weekday: number, hour: number): Date {
  const now = new Date();
  for (let i = minDaysAway; i < minDaysAway + 14; i += 1) {
    const candidate = new Date(now.getTime() + i * 86_400_000);
    const p = istParts(candidate);
    if (p.weekday === weekday) {
      return new Date(Date.UTC(p.year, p.month - 1, p.day, hour - 5, -30));
    }
  }
  throw new Error("no matching weekday found");
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function cohortCode(prefix: string, startsOn: Date): string {
  const p = istParts(startsOn);
  return `${prefix}-${p.year}-${String(p.month).padStart(2, "0")}`;
}

/// True when a programme already has at least one cohort, in any state. The
/// seed then leaves that programme's schedule entirely alone — it exists to
/// bootstrap an empty database, not to manage a running business.
async function hasCohorts(programId: string): Promise<boolean> {
  return (await prisma.cohort.count({ where: { programId } })) > 0;
}

async function main() {
  // -------------------------------------------------------------------------
  // Programmes
  // -------------------------------------------------------------------------

  await prisma.program.upsert({
    where: { slug: "consultation" },
    update: {},
    create: {
      slug: "consultation",
      kind: ProgramKind.CONSULTATION,
      title: "30-minute Gen AI consultation",
      tagline: "One-on-one, live. Work out where you should actually start.",
      description:
        "A focused 30 minutes with the instructor, one-on-one. You share your background and what you are trying to build or move towards; we map it to a concrete path — which concepts matter for you, what to skip, which of the two live programmes fits, and what you can start on this week. You leave with a written plan, not a sales pitch.",
      priceInPaise: 49_900,
      listInPaise: 100_000,
      durationMin: 30,
      seatsDefault: 1,
      sortOrder: 1,
      outcomes: [
        "A written 90-day plan matched to your background and goal",
        "A straight answer on whether you need the technical track or the ecosystem track",
        "The specific gaps to close first — and what you can safely ignore",
        "Reading and tooling picked for your stack, not a generic list",
      ],
      prerequisites: ["None. Come as you are — the intake form does the rest."],
    },
  });

  const research = await prisma.program.upsert({
    where: { slug: "research-cohort" },
    update: {},
    create: {
      slug: "research-cohort",
      kind: ProgramKind.COHORT,
      title: "Applied Gen AI Research: RAG & Agent Development",
      tagline: "Four papers, a RAG framework you build, and agents that hold up. Highly technical.",
      description:
        "A live, high-technical cohort for people who already write code. We read four foundational generative AI papers properly — method, ablations, and what actually replicates — then build from them: a retrieval framework you assemble yourself rather than import, and an agent loop with tool use, memory and evaluation. Every session is live; you write code during it and between sessions.",
      priceInPaise: 2_499_900,
      listInPaise: 5_000_000,
      liveHours: 10,
      cadenceDays: 45,
      seatsDefault: 16,
      sortOrder: 2,
      outcomes: [
        "Read and critique a generative AI paper without needing a summary",
        "Build a RAG pipeline end to end — chunking, embeddings, hybrid search, reranking",
        "Measure retrieval and groundedness instead of eyeballing outputs",
        "Implement an agent loop with tool calling, memory and failure recovery",
        "Know which production failures come from retrieval, which from the model, and which from your prompt",
      ],
      prerequisites: [
        "Comfortable writing Python day to day",
        "Have called an LLM API at least once",
        "Basic familiarity with vectors and embeddings helps but is not required",
      ],
    },
  });

  const ecosystem = await prisma.program.upsert({
    where: { slug: "genai-ecosystem" },
    update: {},
    create: {
      slug: "genai-ecosystem",
      kind: ProgramKind.BATCH,
      title: "Step Up to the Gen AI Ecosystem",
      tagline: "Fifteen live hours to go from using AI to building with it. Low on jargon.",
      description:
        "A live batch for professionals who need real command of generative AI without a computer science background. We cover how these models actually behave, where they break, how retrieval and agents work conceptually, and how to design and ship an AI-assisted workflow in your own job. Light on maths, heavy on judgement and hands-on practice.",
      priceInPaise: 1_499_900,
      listInPaise: 3_000_000,
      liveHours: 15,
      cadenceDays: 30,
      seatsDefault: 25,
      sortOrder: 3,
      outcomes: [
        "Explain what a generative model can and cannot be trusted with, and why",
        "Write prompts that hold up across inputs instead of working once",
        "Get structured, machine-usable output out of a model",
        "Understand retrieval and agents well enough to scope and commission them",
        "Ship one real AI-assisted workflow in your own role by the end",
      ],
      prerequisites: [
        "No coding required",
        "Bring a real problem from your work — you will build against it",
      ],
    },
  });

  // -------------------------------------------------------------------------
  // Upcoming cohort (research track, 45-day cadence) — 5 × 2h on weekends
  // -------------------------------------------------------------------------

  const researchStart = nextWeekend(14, 6, 10); // a Saturday, 10:00 IST
  const researchSessions = [
    {
      title: "Retrieval, from first principles",
      summary:
        "Why parametric knowledge fails, what retrieval actually fixes, and the architecture the original RAG paper proposed. We set up the codebase and index a real corpus.",
      readingTitle: "Lewis et al. (2020) — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      readingUrl: "https://arxiv.org/abs/2005.11401",
    },
    {
      title: "Building the RAG framework",
      summary:
        "Chunking strategies and what they cost you, embedding choice, hybrid dense/sparse search, and reranking. You assemble the pipeline yourself rather than importing one.",
      readingTitle: "Asai et al. (2023) — Self-RAG: Learning to Retrieve, Generate and Critique through Self-Reflection",
      readingUrl: "https://arxiv.org/abs/2310.11511",
    },
    {
      title: "Evaluation and failure analysis",
      summary:
        "Retrieval metrics, groundedness and citation checking, building a test set that catches regressions. Separating retrieval failures from generation failures.",
      readingTitle: null,
      readingUrl: null,
    },
    {
      title: "Agents: the reasoning-acting loop",
      summary:
        "The ReAct pattern, tool calling, and how an agent loop is structured in practice. We convert the RAG pipeline into a tool an agent can call.",
      readingTitle: "Yao et al. (2022) — ReAct: Synergizing Reasoning and Acting in Language Models",
      readingUrl: "https://arxiv.org/abs/2210.03629",
    },
    {
      title: "Tool use, memory and production hardening",
      summary:
        "Self-supervised tool learning, memory design, budget and loop control, and the failure modes that only show up under real traffic.",
      readingTitle: "Schick et al. (2023) — Toolformer: Language Models Can Teach Themselves to Use Tools",
      readingUrl: "https://arxiv.org/abs/2302.04761",
    },
  ];

  if (await hasCohorts(research.id)) {
    console.log("Research track already has cohorts — leaving its schedule alone.");
  } else {
    const researchCohort = await prisma.cohort.create({
      data: {
        programId: research.id,
        code: cohortCode("RAG", researchStart),
        startsOn: researchStart,
        endsOn: addDays(researchStart, 28),
        seats: research.seatsDefault,
        status: CohortStatus.OPEN,
        meetingNotes: "Sessions run on Google Meet. The link is the same every week.",
      },
    });

    await prisma.cohortSession.createMany({
      // One session per weekend, on the same weekday each time so the calendar
      // stays predictable.
      data: researchSessions.map((session, index) => ({
        cohortId: researchCohort.id,
        sequence: index + 1,
        title: session.title,
        summary: session.summary,
        startsAt: addDays(researchStart, index * 7),
        durationMin: 120,
        readingTitle: session.readingTitle,
        readingUrl: session.readingUrl,
      })),
    });
    console.log(`Created starting cohort ${researchCohort.code}.`);
  }

  // -------------------------------------------------------------------------
  // Upcoming batch (ecosystem track, 30-day cadence) — 10 × 1.5h
  // -------------------------------------------------------------------------

  // Saturday, so the two sessions in a weekend fall on Sat + Sun. Starting on
  // a Sunday would push the second one onto a Monday. 14:00 keeps it clear of
  // the research cohort's morning block.
  const ecoStart = nextWeekend(10, 6, 14); // a Saturday, 14:00 IST
  const ecoSessions = [
    ["What a generative model actually does", "A working mental model of prediction, context and sampling — without the maths. Why the same prompt gives different answers."],
    ["The landscape, honestly", "Which models exist, what they cost, where each is genuinely better, and how to choose without chasing benchmarks."],
    ["Prompting that survives contact with reality", "Moving from prompts that worked once to prompts that hold across a hundred inputs. Structure, examples, constraints."],
    ["Getting structured output", "Making a model return data your spreadsheet or system can consume, and validating it."],
    ["Your own documents: retrieval, conceptually", "What RAG is, what it fixes, what it does not, and how to judge whether a vendor's version is any good."],
    ["Agents and automation", "What 'agent' means once you strip the marketing, where automation pays off, and where it quietly costs you."],
    ["A gentle first API call", "Enough hands-on to understand what your engineers are doing. Copy-paste friendly, no prior coding assumed."],
    ["Quality, hallucination and guardrails", "How to test AI output like you would test a new hire's work. Building a review process that scales."],
    ["Cost, privacy, security and governance", "What leaves your building, what it costs at volume, and the policy questions to settle before you roll out."],
    ["Capstone: ship one workflow", "You present the AI-assisted workflow you built during the batch and get live critique."],
  ] as const;

  if (await hasCohorts(ecosystem.id)) {
    console.log("Ecosystem track already has batches — leaving its schedule alone.");
  } else {
    const ecoCohort = await prisma.cohort.create({
      data: {
        programId: ecosystem.id,
        code: cohortCode("ECO", ecoStart),
        startsOn: ecoStart,
        endsOn: addDays(ecoStart, 63),
        seats: ecosystem.seatsDefault,
        status: CohortStatus.OPEN,
        meetingNotes: "Sessions run on Zoom. Recordings are posted within 24 hours.",
      },
    });

    await prisma.cohortSession.createMany({
      // Two sessions a weekend — Saturday then Sunday — across five weekends.
      data: ecoSessions.map(([title, summary], index) => ({
        cohortId: ecoCohort.id,
        sequence: index + 1,
        title,
        summary,
        startsAt: addDays(ecoStart, Math.floor(index / 2) * 7 + (index % 2)),
        durationMin: 90,
      })),
    });
    console.log(`Created starting batch ${ecoCohort.code}.`);
  }

  // -------------------------------------------------------------------------
  // Consultation availability — next four weekends.
  //
  // The weekend is banded so the instructor is never double-booked: research
  // cohort in the morning, ecosystem batch after lunch, one-on-ones in the
  // evening (see DEFAULT_SLOT_TIMES).
  // -------------------------------------------------------------------------

  // createMany + skipDuplicates rather than a loop of upserts: this runs on
  // every deploy and only the gaps are new, so one statement beats ~50.
  const added = await prisma.availabilitySlot.createMany({
    data: generateWeekendSlots({ weeks: 4 }).map((startsAt) => ({
      startsAt,
      durationMin: SLOT_DURATION_MIN,
    })),
    skipDuplicates: true,
  });
  if (added.count > 0) console.log(`Topped up availability with ${added.count} new slot(s).`);

  // -------------------------------------------------------------------------
  // Downloads
  // -------------------------------------------------------------------------

  const resources = [
    {
      slug: "research-cohort-syllabus",
      title: "Research Cohort — full syllabus",
      description:
        "Session-by-session breakdown, the four papers, what you build each week, and the prerequisites in detail.",
      fileUrl: "/downloads/research-cohort-syllabus.pdf",
      audience: ResourceAudience.PUBLIC,
      programId: research.id,
      sortOrder: 1,
    },
    {
      slug: "ecosystem-batch-syllabus",
      title: "Gen AI Ecosystem — full syllabus",
      description:
        "All ten sessions, the capstone brief, and what you should be able to do at the end of each one.",
      fileUrl: "/downloads/ecosystem-batch-syllabus.pdf",
      audience: ResourceAudience.PUBLIC,
      programId: ecosystem.id,
      sortOrder: 2,
    },
    {
      slug: "paper-reading-list",
      title: "Generative AI reading list",
      description:
        "The four cohort papers plus the surrounding work, in the order that makes them easiest to read.",
      fileUrl: "/downloads/paper-reading-list.pdf",
      audience: ResourceAudience.PUBLIC,
      sortOrder: 3,
    },
    {
      slug: "rag-evaluation-checklist",
      title: "RAG evaluation checklist",
      description:
        "The checks to run before putting a retrieval system in front of users. Shared with everyone who books a consultation.",
      fileUrl: "/downloads/rag-evaluation-checklist.pdf",
      audience: ResourceAudience.CONSULTATION,
      sortOrder: 4,
    },
    {
      slug: "cohort-workbook",
      title: "Cohort workbook and starter repository",
      description:
        "Exercises, the starter codebase and the sample corpus. Available to confirmed learners.",
      fileUrl: "/downloads/cohort-workbook.pdf",
      audience: ResourceAudience.ENROLLED,
      programId: research.id,
      sortOrder: 5,
    },
  ];

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: { slug: resource.slug },
      update: {},
      create: resource,
    });
  }

  const openSlots = await prisma.availabilitySlot.count({
    where: { status: "OPEN", startsAt: { gte: new Date() } },
  });
  console.log(
    `Catalogue: ${await prisma.program.count()} programmes, ${await prisma.cohort.count()} cohorts, ` +
      `${await prisma.cohortSession.count()} sessions, ${await prisma.resource.count()} resources, ` +
      `${openSlots} open consultation slots.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
