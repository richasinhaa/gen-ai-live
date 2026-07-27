import { buildCalendar, type CalendarEvent } from "@/lib/ics";
import {
  findBooking,
  findEnrollment,
  isBookingConfirmed,
  isEnrollmentConfirmed,
} from "@/lib/lookup";
import { site } from "@/lib/site";

/// Serves an .ics for a confirmed booking or enrolment. The route matches
/// "REF.ics" as well as a bare reference so the download lands with a sensible
/// filename in every browser.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const raw = (await params).reference;
  const reference = raw.replace(/\.ics$/i, "");

  let events: CalendarEvent[] = [];
  let filename = reference;

  if (reference.startsWith("CON-")) {
    const booking = await findBooking(reference);
    if (!booking || !isBookingConfirmed(booking.status)) {
      return new Response("Not found", { status: 404 });
    }
    filename = `consultation-${reference}`;
    events = [
      {
        uid: `${booking.id}@genailive`,
        title: `Gen AI consultation (${site.name})`,
        description: booking.slot.meetingUrl
          ? `Join: ${booking.slot.meetingUrl}\nReference: ${reference}`
          : `Reference: ${reference}. The joining link is emailed before the session.`,
        location: booking.slot.meetingUrl ?? "Online",
        startsAt: booking.slot.startsAt,
        durationMin: booking.slot.durationMin,
      },
    ];
  } else if (reference.startsWith("ENR-")) {
    const enrollment = await findEnrollment(reference);
    if (!enrollment || !isEnrollmentConfirmed(enrollment.status)) {
      return new Response("Not found", { status: 404 });
    }
    const { cohort } = enrollment;
    filename = `${cohort.code.toLowerCase()}-${reference}`;
    events = cohort.sessions.map((session) => {
      const url = session.meetingUrl ?? cohort.meetingUrl;
      return {
        uid: `${session.id}@genailive`,
        title: `${cohort.program.title} — ${session.sequence}. ${session.title}`,
        description: [
          session.summary,
          session.readingTitle ? `Reading: ${session.readingTitle}` : null,
          url ? `Join: ${url}` : null,
          `Reference: ${reference}`,
        ]
          .filter(Boolean)
          .join("\n"),
        location: url ?? "Online",
        startsAt: session.startsAt,
        durationMin: session.durationMin,
      };
    });
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(buildCalendar(events, site.name), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
