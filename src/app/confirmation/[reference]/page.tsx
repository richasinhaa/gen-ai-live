import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ResourceAudience } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  findBooking,
  findEnrollment,
  isBookingConfirmed,
  isEnrollmentConfirmed,
} from "@/lib/lookup";
import { formatDateTimeIST, formatINR, formatSlotRange, formatDayIST, formatTimeIST } from "@/lib/format";
import { site } from "@/lib/site";
import { CheckIcon, DownloadIcon, VideoIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  // A reference in a search index would leak the one thing that unlocks
  // material, so keep these pages out of indexes entirely.
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  if (reference.startsWith("CON-")) {
    const booking = await findBooking(reference);
    if (!booking) notFound();
    return <ConsultationConfirmation booking={booking} />;
  }

  if (reference.startsWith("ENR-")) {
    const enrollment = await findEnrollment(reference);
    if (!enrollment) notFound();
    return <EnrollmentConfirmation enrollment={enrollment} />;
  }

  notFound();
}

async function ConsultationConfirmation({
  booking,
}: {
  booking: NonNullable<Awaited<ReturnType<typeof findBooking>>>;
}) {
  const confirmed = isBookingConfirmed(booking.status);
  const unlocked = confirmed
    ? await prisma.resource.findMany({
        where: { isActive: true, audience: ResourceAudience.CONSULTATION },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <Shell
      confirmed={confirmed}
      status={booking.status}
      reference={booking.reference}
      title={confirmed ? "Your consultation is booked" : "Payment not completed"}
      amountPaise={booking.amountPaise}
      name={booking.person.fullName}
      email={booking.person.email}
    >
      <Panel title="When">
        <p className="text-lg font-medium">{formatDayIST(booking.slot.startsAt)}</p>
        <p className="text-muted">
          {formatSlotRange(booking.slot.startsAt, booking.slot.durationMin)}
        </p>
      </Panel>

      {confirmed && (
        <>
          <Panel title="Joining link">
            {booking.slot.meetingUrl ? (
              <a
                href={booking.slot.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <VideoIcon className="h-4 w-4" />
                Join on {booking.slot.meetingProvider === "ZOOM" ? "Zoom" : "Google Meet"}
              </a>
            ) : (
              <p className="text-muted">
                We send the {booking.slot.meetingProvider === "ZOOM" ? "Zoom" : "Google Meet"} link
                to {booking.person.email} at least 24 hours before your slot. It will also appear
                here — bookmark this page.
              </p>
            )}
            <a
              href={`/api/calendar/${booking.reference}.ics`}
              className="btn btn-secondary mt-3 sm:mt-0 sm:ml-3"
            >
              Add to calendar
            </a>
          </Panel>

          <Panel title="Before we meet">
            <p className="prose-body">
              Nothing to prepare. We already have your intake notes; if anything changes, reply to
              your confirmation email and we will work from the update instead.
            </p>
          </Panel>

          {unlocked.length > 0 && <Unlocked resources={unlocked} reference={booking.reference} />}
        </>
      )}
    </Shell>
  );
}

async function EnrollmentConfirmation({
  enrollment,
}: {
  enrollment: NonNullable<Awaited<ReturnType<typeof findEnrollment>>>;
}) {
  const confirmed = isEnrollmentConfirmed(enrollment.status);
  const { cohort } = enrollment;
  const unlocked = confirmed
    ? await prisma.resource.findMany({
        where: {
          isActive: true,
          OR: [
            { audience: ResourceAudience.CONSULTATION },
            { audience: ResourceAudience.ENROLLED, programId: cohort.programId },
            { audience: ResourceAudience.ENROLLED, programId: null },
          ],
        },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <Shell
      confirmed={confirmed}
      status={enrollment.status}
      reference={enrollment.reference}
      title={confirmed ? "You're in" : "Payment not completed"}
      amountPaise={enrollment.amountPaise}
      name={enrollment.person.fullName}
      email={enrollment.person.email}
    >
      <Panel title={cohort.program.title}>
        <p className="text-muted">
          {cohort.code} · starts {formatDateTimeIST(cohort.startsOn)}
        </p>
      </Panel>

      {confirmed && (
        <>
          <Panel title="Joining link">
            {cohort.meetingUrl ? (
              <a
                href={cohort.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <VideoIcon className="h-4 w-4" />
                Join on {cohort.meetingProvider === "ZOOM" ? "Zoom" : "Google Meet"}
              </a>
            ) : (
              <p className="text-muted">
                {cohort.meetingNotes ??
                  "The recurring link is sent before the first session and will appear here."}
              </p>
            )}
            <a
              href={`/api/calendar/${enrollment.reference}.ics`}
              className="btn btn-secondary mt-3 sm:mt-0 sm:ml-3"
            >
              Add all sessions to calendar
            </a>
          </Panel>

          <Panel title="Your schedule">
            <ol className="space-y-2.5">
              {cohort.sessions.map((session) => (
                <li key={session.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span>
                    <span className="text-faint font-mono text-sm mr-2">
                      {String(session.sequence).padStart(2, "0")}
                    </span>
                    {session.title}
                  </span>
                  <span className="text-sm text-faint">
                    {formatDayIST(session.startsAt)} · {formatTimeIST(session.startsAt)}{" "}
                    {site.timezoneLabel}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          {unlocked.length > 0 && (
            <Unlocked resources={unlocked} reference={enrollment.reference} />
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({
  confirmed,
  status,
  reference,
  title,
  amountPaise,
  name,
  email,
  children,
}: {
  confirmed: boolean;
  status: string;
  reference: string;
  title: string;
  amountPaise: number;
  name: string;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-14 lg:py-20 max-w-3xl">
      <div className="flex items-start gap-4">
        {confirmed && (
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
            <CheckIcon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="prose-body mt-2">
            {confirmed ? (
              <>
                Hi {name.split(" ")[0]} — a confirmation is on its way to {email}. Keep this
                reference; it unlocks your material.
              </>
            ) : (
              <>
                We have not received a payment for this reference yet. If money left your account,
                give it a minute and refresh — otherwise nothing was charged and you can try
                again.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="card p-5 mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Reference</p>
          <p className="font-mono text-lg mt-1">{reference}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-faint">Amount</p>
          <p className="text-lg mt-1">
            {formatINR(amountPaise)}{" "}
            <span className="text-sm text-faint">({status.toLowerCase().replace("_", " ")})</span>
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">{children}</div>

      {!confirmed && (
        <div className="mt-8 flex gap-3">
          <Link href="/consultation" className="btn btn-primary">
            Try again
          </Link>
          <a href={`mailto:${site.email}?subject=Payment%20issue%20${reference}`} className="btn btn-secondary">
            Email us
          </a>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Unlocked({
  resources,
  reference,
}: {
  resources: { id: string; slug: string; title: string; description: string | null; fileUrl: string }[];
  reference: string;
}) {
  return (
    <Panel title="Your downloads">
      <p className="prose-body text-sm mb-4">
        These stay available to you. Elsewhere on the site they need reference{" "}
        <span className="font-mono">{reference}</span> and your email.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.fileUrl}
            className="card p-4 flex items-start gap-3 hover:border-faint transition-colors"
          >
            <DownloadIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-medium">{resource.title}</span>
              {resource.description && (
                <span className="block text-sm text-faint mt-0.5">{resource.description}</span>
              )}
            </span>
          </a>
        ))}
      </div>
    </Panel>
  );
}
