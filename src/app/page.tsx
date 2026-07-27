import Link from "next/link";
import { CohortStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatINR, discountPercent, formatDateIST } from "@/lib/format";
import { ArrowIcon, CheckIcon, VideoIcon } from "@/components/icons";
import { FounderCard } from "@/components/founder-card";
import { PROGRAM_SLUGS, site } from "@/lib/site";

// Prices, seats and cohort dates all change from the admin screen; never serve
// this page from a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const programs = await prisma.program.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      cohorts: {
        where: { status: CohortStatus.OPEN, startsOn: { gte: new Date() } },
        orderBy: { startsOn: "asc" },
        take: 1,
      },
    },
  });

  const consultation = programs.find((p) => p.slug === PROGRAM_SLUGS.consultation);
  const tracks = programs.filter((p) => p.slug !== PROGRAM_SLUGS.consultation);

  return (
    <>
      <Hero consultationPrice={consultation?.priceInPaise} consultationList={consultation?.listInPaise} />

      <section className="container-page py-20" id="programs">
        <div className="max-w-2xl">
          <p className="eyebrow">Two live tracks</p>
          <h2 className="text-3xl sm:text-4xl font-semibold mt-3">
            Pick the one that matches how you work
          </h2>
          <p className="prose-body mt-4">
            One is for people who write code and want to read the papers properly. The other is
            for people who need real command of this without a computer science background.
            Not sure? Book the consultation — that is exactly what it is for.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-10">
          {tracks.map((program) => {
            const nextCohort = program.cohorts[0];
            const off = discountPercent(program.priceInPaise, program.listInPaise);
            return (
              <article key={program.id} className="card p-7 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">
                      {program.kind === "COHORT" ? "Cohort" : "Batch"} · every {program.cadenceDays} days
                    </p>
                    <h3 className="text-xl font-semibold mt-2">{program.title}</h3>
                  </div>
                  {off && (
                    <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-md bg-accent-dim text-accent-soft">
                      {off}% off
                    </span>
                  )}
                </div>

                <p className="prose-body text-sm mt-3">{program.tagline}</p>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-6 text-sm">
                  <Stat label="Live hours" value={`${program.liveHours} hours`} />
                  <Stat label="Seats" value={`${program.seatsDefault} max`} />
                  <Stat
                    label="Next start"
                    value={nextCohort ? formatDateIST(nextCohort.startsOn) : "Dates soon"}
                  />
                  <Stat label="Format" value="Live on Meet / Zoom" />
                </dl>

                <ul className="mt-6 space-y-2">
                  {program.outcomes.slice(0, 3).map((outcome) => (
                    <li key={outcome} className="flex gap-2.5 text-sm text-muted">
                      <CheckIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-7">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-semibold">{formatINR(program.priceInPaise)}</span>
                    {program.listInPaise && (
                      <span className="text-sm text-faint line-through">
                        {formatINR(program.listInPaise)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/programs/${program.slug}`}
                    className="btn btn-primary w-full mt-4"
                  >
                    See the full syllabus
                    <ArrowIcon className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <HowItWorks />

      <section className="container-page pb-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Who teaches this</p>
            <h2 className="text-2xl sm:text-3xl font-semibold mt-3">
              Practitioners, not full-time trainers
            </h2>
            <p className="prose-body mt-4">
              The sessions are run by people who build with this technology. That is why they are
              live and the groups are small — what you are paying for is the questions you get to
              ask, not the slides.
            </p>
            <Link href="/about" className="btn btn-secondary mt-5">
              More about how it runs
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <FounderCard />
        </div>
      </section>

      {consultation && (
        <section className="container-page pb-4">
          <div className="card p-8 sm:p-10 bg-surface-2">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <p className="eyebrow">Not sure which one?</p>
                <h2 className="text-2xl sm:text-3xl font-semibold mt-3">{consultation.title}</h2>
                <p className="prose-body mt-4 max-w-xl">{consultation.description}</p>
                <ul className="mt-6 grid sm:grid-cols-2 gap-2.5">
                  {consultation.outcomes.map((outcome) => (
                    <li key={outcome} className="flex gap-2.5 text-sm text-muted">
                      <CheckIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-6 bg-ink">
                <p className="text-sm text-muted">One-on-one, 30 minutes</p>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-3xl font-semibold">
                    {formatINR(consultation.priceInPaise)}
                  </span>
                  {consultation.listInPaise && (
                    <span className="text-sm text-faint line-through">
                      {formatINR(consultation.listInPaise)}
                    </span>
                  )}
                </div>
                <p className="field-help">Weekend slots, {site.timezoneLabel}.</p>
                <Link href="/consultation" className="btn btn-primary w-full mt-5">
                  Pick a slot
                  <ArrowIcon className="h-4 w-4" />
                </Link>
                <p className="field-help text-center">
                  Reschedule free up to 12 hours before.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Hero({
  consultationPrice,
  consultationList,
}: {
  consultationPrice?: number;
  consultationList?: number | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line-soft">
      {/* Single soft light source behind the headline — keeps the page from
          reading as a flat black rectangle without adding chrome. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[28rem] opacity-[0.16]"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, var(--color-accent) 0%, transparent 70%)",
        }}
      />
      <div className="container-page relative py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-muted border border-line rounded-full px-3 py-1.5">
          <VideoIcon className="h-3.5 w-3.5 text-accent" />
          Live sessions on Google Meet or Zoom
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold mt-6 max-w-3xl leading-[1.08]">
          Learn generative AI the way it is actually built.
        </h1>

        <p className="prose-body text-lg mt-6 max-w-2xl">
          Small live cohorts on RAG, agent development and applied research — plus a lower-jargon
          track for professionals stepping into the ecosystem. No recordings-only courses, no
          hundred-person webinars.
        </p>

        <div className="flex flex-wrap gap-3 mt-9">
          {/* One flowing label rather than two flex children — on a narrow
              screen the price should wrap with the text, not sit off to the
              right on its own line. */}
          <Link href="/consultation" className="btn btn-primary text-left">
            <span>
              Book a 30-min consultation
              {consultationPrice != null && (
                <>
                  {" · "}
                  <span className="font-normal opacity-80">
                    {formatINR(consultationPrice)}
                  </span>
                  {consultationList ? (
                    <span className="font-normal line-through ml-1.5 opacity-60">
                      {formatINR(consultationList)}
                    </span>
                  ) : null}
                </>
              )}
            </span>
          </Link>
          <Link href="#programs" className="btn btn-secondary">
            See the two tracks
          </Link>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 max-w-3xl">
          <HeroStat value="10 hrs" label="Research cohort, live" />
          <HeroStat value="15 hrs" label="Ecosystem batch, live" />
          <HeroStat value="4" label="Papers read properly" />
          <HeroStat value="16–25" label="Seats, never more" />
        </dl>
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block text-2xl font-semibold">{value}</span>
        <span className="block text-sm text-faint mt-1">{label}</span>
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

const STEPS = [
  {
    title: "Tell us where you are",
    body: "A short intake — your background, what you can already do, and what you are trying to reach. It takes two minutes and it decides what we prepare.",
  },
  {
    title: "Pay and get your seat",
    body: "Secure checkout over UPI, card or netbanking. Your reference and joining details land on the confirmation page immediately.",
  },
  {
    title: "Join live",
    body: "Sessions run on Google Meet or Zoom. The link, the reading and the workbook all sit behind your reference on this site.",
  },
  {
    title: "Keep the material",
    body: "Syllabus, papers, starter repository and session notes stay available to you after the cohort ends.",
  },
];

function HowItWorks() {
  return (
    <section className="container-page py-16">
      <p className="eyebrow">How it runs</p>
      <h2 className="text-3xl font-semibold mt-3">Four steps, no chasing</h2>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        {STEPS.map((step, index) => (
          <li key={step.title} className="card p-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim text-accent font-semibold text-sm">
              {index + 1}
            </span>
            <h3 className="font-semibold mt-4">{step.title}</h3>
            <p className="prose-body text-sm mt-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
