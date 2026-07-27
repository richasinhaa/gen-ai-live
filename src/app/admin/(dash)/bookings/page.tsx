import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTimeIST, formatINR } from "@/lib/format";
import { saveInstructorNotes, setBookingAttendance } from "../../actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-positive/15 text-positive",
  COMPLETED: "bg-accent-dim text-accent-soft",
  PENDING_PAYMENT: "bg-surface-2 text-faint",
  CANCELLED: "bg-surface-2 text-faint",
  REFUNDED: "bg-danger/15 text-danger",
};

export default async function AdminBookingsPage() {
  const bookings = await prisma.consultationBooking.findMany({
    where: { status: { not: BookingStatus.CANCELLED } },
    include: { person: true, slot: true },
    orderBy: { slot: { startsAt: "desc" } },
    take: 100,
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">Consultations</h2>
      <p className="prose-body text-sm mt-1 mb-6">
        The intake notes are what the learner wrote at booking. Abandoned checkouts are cancelled
        automatically and hidden here.
      </p>

      {bookings.length === 0 ? (
        <p className="card p-6 text-sm text-faint">No bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <article key={booking.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold">{booking.person.fullName}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        STATUS_STYLES[booking.status] ?? "bg-surface-2 text-faint"
                      }`}
                    >
                      {booking.status.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-faint mt-1">
                    <a href={`mailto:${booking.person.email}`} className="hover:text-text">
                      {booking.person.email}
                    </a>
                    {booking.person.phone && ` · ${booking.person.phone}`}
                    {booking.person.linkedin && (
                      <>
                        {" · "}
                        <a
                          href={booking.person.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-text"
                        >
                          LinkedIn
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{formatDateTimeIST(booking.slot.startsAt)}</p>
                  <p className="text-faint font-mono">{booking.reference}</p>
                  <p className="text-faint">{formatINR(booking.amountPaise)}</p>
                </div>
              </div>

              {booking.intakeNotes && (
                <pre className="mt-4 p-4 rounded-lg bg-ink border border-line text-sm text-muted whitespace-pre-wrap font-sans leading-relaxed">
                  {booking.intakeNotes}
                </pre>
              )}

              {booking.status !== BookingStatus.PENDING_PAYMENT && (
                <div className="mt-4 grid lg:grid-cols-[1fr_auto] gap-4 items-start">
                  <form action={saveInstructorNotes} className="space-y-2">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <label
                      htmlFor={`notes-${booking.id}`}
                      className="text-xs uppercase tracking-wider text-faint"
                    >
                      Your notes (private)
                    </label>
                    <textarea
                      id={`notes-${booking.id}`}
                      name="instructorNotes"
                      rows={2}
                      defaultValue={booking.instructorNotes ?? ""}
                      className="field-input resize-y"
                      placeholder="What you covered, what to follow up on…"
                    />
                    <button type="submit" className="btn btn-secondary text-sm py-1.5">
                      Save notes
                    </button>
                  </form>

                  <form action={setBookingAttendance}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="attended" value={String(!booking.attended)} />
                    <button type="submit" className="btn btn-secondary text-sm py-1.5">
                      {booking.attended ? "Mark not attended" : "Mark attended"}
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
