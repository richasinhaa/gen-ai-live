import { CohortStatus, EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateIST, formatDateTimeIST, formatINR } from "@/lib/format";
import { setSessionLinks } from "../../actions";
import { CohortSettings } from "./cohort-settings";

export const dynamic = "force-dynamic";

export default async function AdminCohortsPage() {
  const cohorts = await prisma.cohort.findMany({
    where: { status: { notIn: [CohortStatus.COMPLETED, CohortStatus.CANCELLED] } },
    include: {
      program: true,
      sessions: { orderBy: { sequence: "asc" } },
      enrollments: {
        where: { status: { in: [EnrollmentStatus.CONFIRMED, EnrollmentStatus.COMPLETED] } },
        include: { person: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startsOn: "asc" },
  });

  if (cohorts.length === 0) {
    return <p className="card p-6 text-sm text-faint">No active cohorts.</p>;
  }

  return (
    <div className="space-y-8">
      {cohorts.map((cohort) => (
        <article key={cohort.id} className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{cohort.program.title}</h2>
              <p className="text-sm text-faint mt-1">
                {cohort.code} · {formatDateIST(cohort.startsOn)} → {formatDateIST(cohort.endsOn)}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">
                {cohort.enrollments.length} / {cohort.seats} seats
              </p>
              <p className="text-faint">
                {formatINR(cohort.enrollments.reduce((sum, e) => sum + e.amountPaise, 0))} collected
              </p>
            </div>
          </div>

          <CohortSettings
            cohort={{
              id: cohort.id,
              status: cohort.status,
              meetingUrl: cohort.meetingUrl,
              meetingNotes: cohort.meetingNotes,
              meetingProvider: cohort.meetingProvider,
            }}
          />

          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-semibold">
              Roster ({cohort.enrollments.length})
            </summary>
            {cohort.enrollments.length === 0 ? (
              <p className="text-sm text-faint mt-3">Nobody enrolled yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {cohort.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-lg border border-line p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-medium">{enrollment.person.fullName}</p>
                        <p className="text-sm text-faint">
                          <a href={`mailto:${enrollment.person.email}`} className="hover:text-text">
                            {enrollment.person.email}
                          </a>
                          {enrollment.person.phone && ` · ${enrollment.person.phone}`}
                        </p>
                      </div>
                      <p className="text-sm text-faint font-mono">{enrollment.reference}</p>
                    </div>
                    {enrollment.intakeNotes && (
                      <pre className="mt-3 p-3 rounded-lg bg-ink border border-line text-sm text-muted whitespace-pre-wrap font-sans leading-relaxed">
                        {enrollment.intakeNotes}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Sessions ({cohort.sessions.length})
            </summary>
            <div className="mt-3 space-y-3">
              {cohort.sessions.map((session) => (
                <form
                  key={session.id}
                  action={setSessionLinks}
                  className="rounded-lg border border-line p-4"
                >
                  <input type="hidden" name="sessionId" value={session.id} />
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium text-sm">
                      <span className="text-faint font-mono mr-2">
                        {String(session.sequence).padStart(2, "0")}
                      </span>
                      {session.title}
                    </p>
                    <p className="text-sm text-faint">{formatDateTimeIST(session.startsAt)}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <input
                      name="meetingUrl"
                      defaultValue={session.meetingUrl ?? ""}
                      placeholder="Override meeting link (optional)"
                      className="field-input text-sm"
                      aria-label={`Meeting link for session ${session.sequence}`}
                    />
                    <input
                      name="recordingUrl"
                      defaultValue={session.recordingUrl ?? ""}
                      placeholder="Recording link"
                      className="field-input text-sm"
                      aria-label={`Recording link for session ${session.sequence}`}
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary text-sm py-1.5 mt-3">
                    Save
                  </button>
                </form>
              ))}
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}
