import type { Metadata } from "next";
import { SlotStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { releaseExpiredHolds } from "@/lib/payments";
import { formatINR, discountPercent } from "@/lib/format";
import { PROGRAM_SLUGS, site } from "@/lib/site";
import { CheckIcon } from "@/components/icons";
import { BookingForm } from "./booking-form";
import { SubscribeForm } from "@/components/subscribe-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a 30-minute Gen AI consultation",
  description:
    "One-on-one, live, 30 minutes. Bring your background and your goal; leave with a concrete plan and a straight answer on which track fits.",
};

export default async function ConsultationPage() {
  // Reading availability is the natural moment to reap abandoned checkouts.
  await releaseExpiredHolds();

  const [program, slots] = await Promise.all([
    prisma.program.findUnique({ where: { slug: PROGRAM_SLUGS.consultation } }),
    prisma.availabilitySlot.findMany({
      where: { status: SlotStatus.OPEN, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      select: { id: true, startsAt: true, durationMin: true },
      take: 200,
    }),
  ]);

  if (!program) {
    return (
      <div className="container-page py-24">
        <h1 className="text-3xl font-semibold">Consultations are not set up yet</h1>
        <p className="prose-body mt-3">Email {site.email} and we will book you in directly.</p>
      </div>
    );
  }

  const off = discountPercent(program.priceInPaise, program.listInPaise);

  return (
    <div className="container-page py-14 lg:py-20">
      <div className="grid lg:grid-cols-[1fr_20rem] gap-12 lg:gap-16 items-start">
        <div className="min-w-0">
          <p className="eyebrow">One-on-one · 30 minutes · live</p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3">{program.title}</h1>
          <p className="prose-body text-lg mt-4 max-w-2xl">{program.description}</p>

          {slots.length === 0 ? (
            <div className="card p-8 mt-10">
              <h2 className="text-xl font-semibold">No weekend slots open right now</h2>
              <p className="prose-body mt-2">
                Every slot for the next few weekends is taken. Leave your email and we will write
                to you the moment new ones open — usually within a week.
              </p>
              <div className="mt-5 max-w-sm">
                <SubscribeForm source="consultation-waitlist" interest="consultation" />
              </div>
            </div>
          ) : (
            <BookingForm
              slots={slots.map((slot) => ({
                id: slot.id,
                startsAt: slot.startsAt.toISOString(),
                durationMin: slot.durationMin,
              }))}
              priceLabel={formatINR(program.priceInPaise)}
            />
          )}
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
                {off}% off — introductory
              </span>
            )}
            <hr className="border-line my-5" />
            <h2 className="text-sm font-semibold">What you walk away with</h2>
            <ul className="mt-3 space-y-2.5">
              {program.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-2.5 text-sm text-muted">
                  <CheckIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6 text-sm space-y-3">
            <Row label="When" value={`Weekends only, ${site.timezoneLabel}`} />
            <Row label="Where" value="Google Meet — link on confirmation" />
            <Row label="Format" value="One-on-one with the instructor" />
            <Row label="Reschedule" value="Free up to 12 hours before" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-faint">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
