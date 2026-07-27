import Link from "next/link";
import {
  BookingStatus,
  CohortStatus,
  EnrollmentStatus,
  PaymentStatus,
  SlotStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTimeIST, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    revenue,
    revenue30,
    confirmedBookings,
    upcomingBookings,
    openSlots,
    confirmedEnrollments,
    openCohorts,
    subscribers,
    pendingPayments,
    nextSessions,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { amountPaise: true },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID, paidAt: { gte: thirtyDaysAgo } },
      _sum: { amountPaise: true },
    }),
    prisma.consultationBooking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.consultationBooking.findMany({
      where: { status: BookingStatus.CONFIRMED, slot: { startsAt: { gte: now } } },
      include: { person: true, slot: true },
      orderBy: { slot: { startsAt: "asc" } },
      take: 5,
    }),
    prisma.availabilitySlot.count({
      where: { status: SlotStatus.OPEN, startsAt: { gte: now } },
    }),
    prisma.enrollment.count({ where: { status: EnrollmentStatus.CONFIRMED } }),
    prisma.cohort.count({ where: { status: CohortStatus.OPEN } }),
    prisma.subscriber.count(),
    prisma.payment.count({ where: { status: PaymentStatus.CREATED } }),
    prisma.cohortSession.findMany({
      where: { startsAt: { gte: now }, cohort: { status: { in: [CohortStatus.OPEN, CohortStatus.RUNNING] } } },
      include: { cohort: { include: { program: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold mb-4">At a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Revenue, all time" value={formatINR(revenue._sum.amountPaise ?? 0)} />
          <Metric label="Revenue, last 30 days" value={formatINR(revenue30._sum.amountPaise ?? 0)} />
          <Metric label="Confirmed consultations" value={String(confirmedBookings)} />
          <Metric label="Confirmed enrolments" value={String(confirmedEnrollments)} />
          <Metric label="Open weekend slots" value={String(openSlots)} href="/admin/slots" />
          <Metric label="Cohorts taking enrolments" value={String(openCohorts)} href="/admin/cohorts" />
          <Metric label="Subscribers" value={String(subscribers)} href="/admin/people" />
          <Metric
            label="Checkouts not completed"
            value={String(pendingPayments)}
            hint={pendingPayments > 0 ? "Abandoned or in flight" : undefined}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Next consultations</h2>
        {upcomingBookings.length === 0 ? (
          <Empty>Nothing booked yet.</Empty>
        ) : (
          <div className="card divide-y divide-line">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium">{booking.person.fullName}</p>
                  <p className="text-sm text-faint">
                    {booking.person.email} · {booking.person.phone ?? "no phone"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{formatDateTimeIST(booking.slot.startsAt)}</p>
                  <p className="text-faint font-mono">{booking.reference}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/bookings" className="btn btn-secondary mt-4 text-sm py-2">
          All consultations
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Next live sessions</h2>
        {nextSessions.length === 0 ? (
          <Empty>No sessions scheduled.</Empty>
        ) : (
          <div className="card divide-y divide-line">
            {nextSessions.map((session) => (
              <div key={session.id} className="p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium">
                    <span className="text-faint font-mono text-sm mr-2">
                      {String(session.sequence).padStart(2, "0")}
                    </span>
                    {session.title}
                  </p>
                  <p className="text-sm text-faint">
                    {session.cohort.code} · {session.cohort.program.title}
                  </p>
                </div>
                <p className="text-sm text-right">{formatDateTimeIST(session.startsAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  href?: string;
  hint?: string;
}) {
  const content = (
    <>
      <p className="text-xs uppercase tracking-wider text-faint">{label}</p>
      <p className="text-2xl font-semibold mt-1.5">{value}</p>
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="card p-5 hover:border-faint transition-colors">
      {content}
    </Link>
  ) : (
    <div className="card p-5">{content}</div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card p-6 text-sm text-faint">{children}</p>;
}
