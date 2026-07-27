import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CohortStatus, EnrollmentStatus, ResourceAudience } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  discountPercent,
  formatDateIST,
  formatDateRangeIST,
  formatINR,
  formatTimeIST,
} from "@/lib/format";
import { site } from "@/lib/site";
import { CheckIcon, DownloadIcon } from "@/components/icons";
import { SubscribeForm } from "@/components/subscribe-form";
import { EnrollForm } from "./enroll-form";

export const dynamic = "force-dynamic";

async function loadProgram(slug: string) {
  return prisma.program.findUnique({
    where: { slug },
    include: {
      cohorts: {
        where: { status: { in: [CohortStatus.OPEN, CohortStatus.FULL] }, endsOn: { gte: new Date() } },
        orderBy: { startsOn: "asc" },
        include: {
          sessions: { orderBy: { sequence: "asc" } },
          _count: { select: { enrollments: { where: { status: EnrollmentStatus.CONFIRMED } } } },
        },
      },
      resources: {
        where: { isActive: true, audience: ResourceAudience.PUBLIC },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await prisma.program.findUnique({ where: { slug } });
  if (!program) return { title: "Programme not found" };
  return { title: program.title, description: program.tagline };
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await loadProgram(slug);
  if (!program || !program.isActive) notFound();

  // The consultation is a booking, not an enrolment — it has its own page.
  if (program.kind === "CONSULTATION") {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-semibold">{program.title}</h1>
        <Link href="/consultation" className="btn btn-primary mt-6">
          Go to booking
        </Link>
      </div>
    );
  }

  const openCohorts = program.cohorts.filter(
    (cohort) => cohort.status === CohortStatus.OPEN && cohort._count.enrollments < cohort.seats,
  );
  const nextCohort = program.cohorts[0];
  const syllabus = nextCohort?.sessions ?? [];
  const off = discountPercent(program.priceInPaise, program.listInPaise);
  const label = program.kind === "COHORT" ? "cohort" : "batch";

  return (
    <div className="container-page py-14 lg:py-20">
      <div className="grid lg:grid-cols-[1fr_20rem] gap-12 lg:gap-16 items-start">
        <div className="min-w-0">
          <p className="eyebrow">
            Live {label} · new one every {program.cadenceDays} days · {program.liveHours} hours
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3">{program.title}</h1>
          <p className="prose-body text-lg mt-4">{program.tagline}</p>
          <p className="prose-body mt-4">{program.description}</p>

          <Section title="What you'll be able to do">
            <ul className="space-y-2.5">
              {program.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-muted">
                  <CheckIcon className="h-4 w-4 text-accent shrink-0 mt-1.5" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </Section>

          {syllabus.length > 0 && (
            <Section
              title="Session by session"
              subtitle={
                nextCohort
                  ? `${nextCohort.code} · ${formatDateRangeIST(nextCohort.startsOn, nextCohort.endsOn)}`
                  : undefined
              }
            >
              <ol className="space-y-3">
                {syllabus.map((session) => (
                  <li key={session.id} className="card p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-semibold">
                        <span className="text-faint font-mono text-sm mr-2">
                          {String(session.sequence).padStart(2, "0")}
                        </span>
                        {session.title}
                      </h3>
                      <span className="text-sm text-faint">
                        {formatDateIST(session.startsAt)} · {formatTimeIST(session.startsAt)}{" "}
                        {site.timezoneLabel} · {session.durationMin} min
                      </span>
                    </div>
                    {session.summary && (
                      <p className="prose-body text-sm mt-2">{session.summary}</p>
                    )}
                    {session.readingTitle && (
                      <p className="text-sm mt-3">
                        <span className="text-faint">Paper: </span>
                        {session.readingUrl ? (
                          <a
                            href={session.readingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            {session.readingTitle}
                          </a>
                        ) : (
                          session.readingTitle
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <Section title="Who this is for">
            <ul className="space-y-2.5">
              {program.prerequisites.map((item) => (
                <li key={item} className="flex gap-3 text-muted">
                  <span className="text-accent mt-1.5 leading-none">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {program.resources.length > 0 && (
            <Section title="Download the detail">
              <div className="grid sm:grid-cols-2 gap-3">
                {program.resources.map((resource) => (
                  <Link
                    key={resource.id}
                    href={`/resources#${resource.slug}`}
                    className="card p-4 flex items-start gap-3 hover:border-faint transition-colors"
                  >
                    <DownloadIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{resource.title}</span>
                      <span className="block text-sm text-faint mt-0.5">
                        {resource.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <section id="enrol" className="scroll-mt-24 mt-14">
            <h2 className="text-2xl font-semibold">Enrol</h2>
            {openCohorts.length === 0 ? (
              <div className="card p-7 mt-5">
                <h3 className="font-semibold">
                  {program.cohorts.length > 0
                    ? `This ${label} is full`
                    : `Dates for the next ${label} are being set`}
                </h3>
                <p className="prose-body text-sm mt-2">
                  A new {label} starts every {program.cadenceDays} days. Leave your email and
                  you&apos;ll hear about the next one before it goes public — seats usually go to
                  that list first.
                </p>
                <div className="mt-5 max-w-sm">
                  <SubscribeForm source={`program-${program.slug}`} interest={program.slug} />
                </div>
              </div>
            ) : (
              <EnrollForm
                programTitle={program.title}
                priceLabel={formatINR(program.priceInPaise)}
                cohorts={openCohorts.map((cohort) => ({
                  id: cohort.id,
                  code: cohort.code,
                  startsOn: cohort.startsOn.toISOString(),
                  endsOn: cohort.endsOn.toISOString(),
                  seatsLeft: cohort.seats - cohort._count.enrollments,
                }))}
              />
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 space-y-5">
          <div className="card p-6">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-semibold">{formatINR(program.priceInPaise)}</span>
              {program.listInPaise && (
                <span className="text-sm text-faint line-through">
                  {formatINR(program.listInPaise)}
                </span>
              )}
            </div>
            {off && (
              <span className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-md bg-accent-dim text-accent-soft">
                {off}% off
              </span>
            )}

            <hr className="border-line my-5" />

            <dl className="space-y-3 text-sm">
              <Row label="Live hours" value={`${program.liveHours} hours`} />
              <Row label="Sessions" value={`${syllabus.length || "—"} live sessions`} />
              <Row label="Seats" value={`${program.seatsDefault} max`} />
              <Row
                label="Next start"
                value={nextCohort ? formatDateIST(nextCohort.startsOn) : "TBA"}
              />
              <Row label="Where" value={nextCohort?.meetingProvider === "ZOOM" ? "Zoom" : "Google Meet"} />
            </dl>

            <Link href="#enrol" className="btn btn-primary w-full mt-6">
              {openCohorts.length > 0 ? "Enrol now" : "Join the list"}
            </Link>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold">Not sure this is the right track?</h2>
            <p className="prose-body text-sm mt-2">
              Book the 30-minute consultation. If it turns out you should be on the other track —
              or neither — we will tell you.
            </p>
            <Link href="/consultation" className="btn btn-secondary w-full mt-4">
              Book a consultation
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-faint mt-1">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-faint">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
