/// Consultation scheduling.
///
/// The instructor only takes one-on-ones on weekends, in IST. Slots are stored
/// as UTC instants; everything here converts between the instructor's wall
/// clock and that storage format.
///
/// India has no daylight saving and has held a fixed UTC+05:30 offset since
/// 1945, so a constant offset is correct here (and keeps slot generation
/// dependency-free). Anything that must survive a timezone rule change should
/// go through Intl instead — see `format.ts`.

const IST_OFFSET_MIN = 5 * 60 + 30;

export const WEEKEND_DAYS = [0, 6] as const; // Sunday, Saturday

/// Default weekend grid: 30-minute one-on-ones in the evening block.
///
/// Weekend mornings belong to the research cohort and afternoons to the
/// ecosystem batch, so consultations sit after both — one instructor cannot be
/// in two rooms. Overridable from the admin screen when the weekend differs.
export const DEFAULT_SLOT_TIMES = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
] as const;

export const SLOT_DURATION_MIN = 30;

/// How long a slot stays reserved for someone mid-checkout before it returns to
/// the pool. Razorpay checkout rarely takes more than a couple of minutes.
export const SLOT_HOLD_MINUTES = 15;

/// Convert an IST wall-clock time to the UTC instant it refers to.
export function istToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MIN * 60_000);
}

/// The IST calendar/clock fields of a UTC instant.
export function istParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

export function isWeekendIST(date: Date): boolean {
  return (WEEKEND_DAYS as readonly number[]).includes(istParts(date).weekday);
}

/// Key an instant by its IST calendar date, for grouping slots into day cards.
export function istDateKey(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseHHMM(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time "${value}" — expected HH:MM`);
  }
  return { hour, minute };
}

/// Generate the weekend slot instants for the next `weeks` weeks, starting from
/// `from`. Times already in the past are skipped so regenerating never
/// backfills dead slots.
export function generateWeekendSlots({
  from = new Date(),
  weeks = 4,
  times = [...DEFAULT_SLOT_TIMES],
}: {
  from?: Date;
  weeks?: number;
  times?: string[];
} = {}): Date[] {
  const parsed = times.map(parseHHMM);
  const slots: Date[] = [];
  const start = istParts(from);
  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));

  for (let i = 0; i < weeks * 7; i += 1) {
    const day = new Date(cursor.getTime() + i * 86_400_000);
    if (!(WEEKEND_DAYS as readonly number[]).includes(day.getUTCDay())) continue;

    for (const { hour, minute } of parsed) {
      const instant = istToUtc(
        day.getUTCFullYear(),
        day.getUTCMonth() + 1,
        day.getUTCDate(),
        hour,
        minute,
      );
      if (instant.getTime() > from.getTime()) slots.push(instant);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
