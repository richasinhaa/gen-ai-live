import { prisma } from "@/lib/db";
import { formatDateIST } from "@/lib/format";
import {
  AI_EXPOSURE_LABELS,
  CODING_COMFORT_LABELS,
  type AI_EXPOSURE,
  type CODING_COMFORT,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function AdminPeoplePage() {
  const [people, subscribers, downloads] = await Promise.all([
    prisma.person.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { bookings: true, enrollments: true } },
      },
    }),
    prisma.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.downloadEvent.groupBy({
      by: ["resourceId"],
      _count: { _all: true },
    }),
  ]);

  const resources = await prisma.resource.findMany({ select: { id: true, title: true } });
  const resourceTitles = new Map(resources.map((r) => [r.id, r.title]));
  const downloadCounts = downloads
    .map((row) => ({
      title: resourceTitles.get(row.resourceId) ?? "Removed file",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold mb-4">People ({people.length})</h2>
        {people.length === 0 ? (
          <p className="card p-6 text-sm text-faint">Nobody has filled in an intake yet.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-faint border-b border-line">
                <tr>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Profile</Th>
                  <Th>Activity</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {people.map((person) => (
                  <tr key={person.id}>
                    <Td>
                      <span className="font-medium">{person.fullName}</span>
                      {person.role && (
                        <span className="block text-faint text-xs mt-0.5">
                          {person.role}
                          {person.organisation ? ` · ${person.organisation}` : ""}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <a href={`mailto:${person.email}`} className="hover:text-accent">
                        {person.email}
                      </a>
                      {person.phone && (
                        <span className="block text-faint text-xs mt-0.5">{person.phone}</span>
                      )}
                    </Td>
                    <Td>
                      {person.codingComfort && (
                        <span className="block text-xs">
                          {CODING_COMFORT_LABELS[
                            person.codingComfort as (typeof CODING_COMFORT)[number]
                          ] ?? person.codingComfort}
                        </span>
                      )}
                      {person.aiExposure && (
                        <span className="block text-xs text-faint mt-0.5">
                          {AI_EXPOSURE_LABELS[
                            person.aiExposure as (typeof AI_EXPOSURE)[number]
                          ] ?? person.aiExposure}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {person._count.bookings} consult · {person._count.enrollments} enrol
                    </Td>
                    <Td className="text-faint whitespace-nowrap">
                      {formatDateIST(person.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Subscribers ({subscribers.length})</h2>
          {subscribers.length === 0 ? (
            <p className="card p-6 text-sm text-faint">No subscribers yet.</p>
          ) : (
            <div className="card divide-y divide-line max-h-96 overflow-y-auto">
              {subscribers.map((subscriber) => (
                <div key={subscriber.id} className="p-3 flex justify-between gap-3 text-sm">
                  <a href={`mailto:${subscriber.email}`} className="hover:text-accent truncate">
                    {subscriber.email}
                  </a>
                  <span className="text-faint whitespace-nowrap text-xs">
                    {subscriber.source ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Downloads</h2>
          {downloadCounts.length === 0 ? (
            <p className="card p-6 text-sm text-faint">Nothing downloaded yet.</p>
          ) : (
            <div className="card divide-y divide-line">
              {downloadCounts.map((row) => (
                <div key={row.title} className="p-3 flex justify-between gap-3 text-sm">
                  <span className="truncate">{row.title}</span>
                  <span className="text-faint">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium whitespace-nowrap">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
