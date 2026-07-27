import { site } from "./site";
import { istParts } from "./slots";

/// Display formatting.
///
/// Dates and times are composed from explicit parts rather than handed to
/// Intl.DateTimeFormat. Two reasons, in order of importance:
///
///  1. Determinism. These helpers run on the server during SSR and again in
///     the browser during hydration. ICU pattern data differs between Node and
///     browsers ("Saturday 1 August" vs "Saturday, 1 August"), which React
///     reports as a hydration mismatch and repaints around.
///  2. Everything learner-facing is quoted in IST regardless of where the
///     reader is, so locale-sensitive formatting would be actively wrong.
///
/// Currency still goes through Intl — it is only ever rendered from values the
/// server passes down as strings, and en-IN grouping is worth having.

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/// Prices are stored in paise everywhere. Render them as whole rupees — none of
/// the current offerings have a paise component.
export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

export function discountPercent(priceInPaise: number, listInPaise?: number | null): number | null {
  if (!listInPaise || listInPaise <= priceInPaise) return null;
  return Math.round(((listInPaise - priceInPaise) / listInPaise) * 100);
}

/// "Sat, 15 Aug 2026"
export function formatDateIST(date: Date | string): string {
  const { year, month, day, weekday } = istParts(new Date(date));
  return `${WEEKDAYS[weekday].slice(0, 3)}, ${day} ${MONTHS[month - 1].slice(0, 3)} ${year}`;
}

/// "Saturday 15 August"
export function formatDayIST(date: Date | string): string {
  const { month, day, weekday } = istParts(new Date(date));
  return `${WEEKDAYS[weekday]} ${day} ${MONTHS[month - 1]}`;
}

/// "10:30 am"
export function formatTimeIST(date: Date | string): string {
  const { hour, minute } = istParts(new Date(date));
  const suffix = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDateTimeIST(date: Date | string): string {
  return `${formatDateIST(date)}, ${formatTimeIST(date)} ${site.timezoneLabel}`;
}

export function formatSlotRange(startsAt: Date | string, durationMin: number): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${formatTimeIST(start)} – ${formatTimeIST(end)} ${site.timezoneLabel}`;
}

export function formatDateRangeIST(startsOn: Date | string, endsOn: Date | string): string {
  return `${formatDateIST(startsOn)} → ${formatDateIST(endsOn)}`;
}
