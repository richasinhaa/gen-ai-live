/// Minimal iCalendar writer — enough for "add this to my calendar" without
/// pulling in a dependency. Times are emitted as UTC (the `Z` form), which every
/// calendar client resolves to the reader's own zone.

export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  durationMin: number;
};

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/// RFC 5545 §3.3.11: escape backslashes, semicolons, commas, and newlines.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/// RFC 5545 §3.1: lines must not exceed 75 octets; continuations start with a
/// single space. Folding on octets rather than characters keeps multi-byte
/// characters intact.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    // First line takes 75 octets, continuations 74 (the leading space counts).
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    // Do not split inside a UTF-8 sequence: back off over continuation bytes.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join("\r\n");
}

export function buildCalendar(events: CalendarEvent[], productName: string): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeText(productName)}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const end = new Date(event.startsAt.getTime() + event.durationMin * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(event.startsAt)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n");
}
