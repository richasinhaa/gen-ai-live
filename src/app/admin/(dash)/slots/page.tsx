import { SlotStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { releaseExpiredHolds } from "@/lib/payments";
import { formatDayIST, formatTimeIST } from "@/lib/format";
import { istDateKey, DEFAULT_SLOT_TIMES } from "@/lib/slots";
import { site } from "@/lib/site";
import { setSlotStatus } from "../../actions";
import { SlotGenerator, DefaultLinkForm } from "./slot-forms";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<SlotStatus, string> = {
  OPEN: "text-positive border-positive/40",
  HELD: "text-accent border-accent/40",
  BOOKED: "text-faint border-line",
  BLOCKED: "text-faint border-line line-through",
};

export default async function AdminSlotsPage() {
  await releaseExpiredHolds();

  const slots = await prisma.availabilitySlot.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      bookings: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: { person: { select: { fullName: true } } },
        take: 1,
      },
    },
  });

  const days = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = istDateKey(slot.startsAt);
    const bucket = days.get(key);
    if (bucket) bucket.push(slot);
    else days.set(key, [slot]);
  }

  return (
    <div className="space-y-8">
      <section className="grid lg:grid-cols-2 gap-5">
        <SlotGenerator defaultTimes={DEFAULT_SLOT_TIMES.join(", ")} />
        <DefaultLinkForm />
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Upcoming weekends ({slots.length} slots)
          </h2>
          <p className="text-sm text-faint">
            All times {site.timezoneLabel}. Click an open slot to block it.
          </p>
        </div>

        {days.size === 0 ? (
          <p className="card p-6 text-sm text-faint mt-4">
            No upcoming slots. Generate some above.
          </p>
        ) : (
          <div className="space-y-3 mt-4">
            {[...days.entries()].map(([key, items]) => (
              <div key={key} className="card p-4">
                <h3 className="text-sm font-semibold">{formatDayIST(items[0].startsAt)}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {items.map((slot) => {
                    const booking = slot.bookings[0];
                    const toggleable =
                      slot.status === SlotStatus.OPEN || slot.status === SlotStatus.BLOCKED;
                    const label = `${formatTimeIST(slot.startsAt)}${
                      booking ? ` · ${booking.person.fullName.split(" ")[0]}` : ""
                    }`;

                    if (!toggleable) {
                      return (
                        <span
                          key={slot.id}
                          className={`px-3 py-1.5 rounded-lg text-sm border ${STATUS_STYLES[slot.status]}`}
                          title={slot.status.toLowerCase()}
                        >
                          {label}
                        </span>
                      );
                    }

                    return (
                      <form key={slot.id} action={setSlotStatus}>
                        <input type="hidden" name="slotId" value={slot.id} />
                        <input
                          type="hidden"
                          name="next"
                          value={slot.status === SlotStatus.OPEN ? "BLOCKED" : "OPEN"}
                        />
                        <button
                          type="submit"
                          className={`px-3 py-1.5 rounded-lg text-sm border hover:bg-surface-2 transition-colors ${
                            STATUS_STYLES[slot.status]
                          }`}
                          title={
                            slot.status === SlotStatus.OPEN
                              ? "Block this slot"
                              : "Reopen this slot"
                          }
                        >
                          {label}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
