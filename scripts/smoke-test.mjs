/// End-to-end check of the money-and-scheduling paths against a running server
/// and a real database. Exercises the parts that are painful to get wrong:
/// slot concurrency, payment idempotency, webhook signatures and download
/// gating.
///
///   npm run dev          # in another shell
///   node scripts/smoke-test.mjs

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "localwebhooksecret";
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function postJson(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, json };
}

const intake = {
  fullName: "Smoke Tester",
  email: "smoke@example.com",
  phone: "+91 98765 43210",
  codingComfort: "COMFORTABLE",
  aiExposure: "PROMPTING",
  goal: "Testing the booking flow end to end, with enough words to pass validation.",
  consent: true,
};

async function cleanup() {
  const emails = ["smoke@example.com", "smoke-dl@example.com"];
  const people = await prisma.person.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const ids = people.map((p) => p.id);
  if (ids.length > 0) {
    await prisma.payment.deleteMany({ where: { personId: { in: ids } } });
    await prisma.consultationBooking.deleteMany({ where: { personId: { in: ids } } });
    await prisma.enrollment.deleteMany({ where: { personId: { in: ids } } });
    await prisma.downloadEvent.deleteMany({ where: { personId: { in: ids } } });
    await prisma.person.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.downloadEvent.deleteMany({ where: { email: { in: emails } } });
  await prisma.subscriber.deleteMany({ where: { email: { in: emails } } });
  await prisma.webhookEvent.deleteMany({ where: { eventId: { startsWith: "smoke-" } } });

  // Return any slot the test claimed — deleting the booking alone would leave
  // it stuck as BOOKED and quietly shrink the real availability grid.
  const orphaned = await prisma.availabilitySlot.findMany({
    where: { status: { in: ["BOOKED", "HELD"] }, bookings: { none: {} } },
    select: { id: true },
  });
  if (orphaned.length > 0) {
    await prisma.availabilitySlot.updateMany({
      where: { id: { in: orphaned.map((slot) => slot.id) } },
      data: { status: "OPEN", heldUntil: null },
    });
  }
}

async function main() {
  await cleanup();

  // -------------------------------------------------------------------------
  section("Validation");

  const missing = await postJson("/api/consultation/book", { email: "nope" });
  check("rejects an incomplete booking", missing.status === 400, `got ${missing.status}`);
  check(
    "reports per-field errors",
    Boolean(missing.json.fields?.email && missing.json.fields?.fullName),
    JSON.stringify(missing.json.fields ?? {}),
  );

  const badSlot = await postJson("/api/consultation/book", {
    ...intake,
    slotId: "does-not-exist",
  });
  check("rejects an unknown slot", badSlot.status === 409, `got ${badSlot.status}`);

  const shortGoal = await postJson("/api/consultation/book", { ...intake, goal: "hi", slotId: "x" });
  check("rejects a one-word goal", shortGoal.status === 400, `got ${shortGoal.status}`);

  const noConsent = await postJson("/api/consultation/book", {
    ...intake,
    consent: false,
    slotId: "x",
  });
  check("requires consent", noConsent.status === 400, `got ${noConsent.status}`);

  // -------------------------------------------------------------------------
  section("Slot concurrency and payment confirmation");

  const slot = await prisma.availabilitySlot.findFirst({
    where: { status: "OPEN", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
  check("an open slot exists to test against", Boolean(slot));
  if (!slot) return;

  // Stand in for the route's work up to the Razorpay call, which needs live
  // keys. Everything after this point is the code that actually matters.
  const person = await prisma.person.create({
    data: {
      email: intake.email,
      fullName: intake.fullName,
      phone: intake.phone,
      codingComfort: intake.codingComfort,
      aiExposure: intake.aiExposure,
      goal: intake.goal,
    },
  });

  const held = await prisma.availabilitySlot.updateMany({
    where: { id: slot.id, status: "OPEN" },
    data: { status: "HELD", heldUntil: new Date(Date.now() + 15 * 60_000) },
  });
  check("first claim on the slot succeeds", held.count === 1);

  const secondClaim = await prisma.availabilitySlot.updateMany({
    where: { id: slot.id, status: "OPEN" },
    data: { status: "HELD" },
  });
  check("a concurrent claim on the same slot is refused", secondClaim.count === 0);

  const booking = await prisma.consultationBooking.create({
    data: {
      reference: "CON-SMOKE",
      personId: person.id,
      slotId: slot.id,
      amountPaise: 49_900,
      intakeNotes: "smoke test",
    },
  });

  const orderId = `order_smoke_${Date.now()}`;
  await prisma.payment.create({
    data: {
      personId: person.id,
      purpose: "CONSULTATION",
      amountPaise: 49_900,
      razorpayOrderId: orderId,
      bookingId: booking.id,
    },
  });

  // Confirmation is driven through the webhook route rather than by importing
  // the service directly — it is the real entry point, signature and all.
  const payload = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_smoke_1", order_id: orderId } } },
  });
  const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");

  const badSig = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "deadbeef" },
    body: payload,
  });
  check("webhook rejects a bad signature", badSig.status === 401, `got ${badSig.status}`);

  const goodSig = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": "smoke-evt-1",
    },
    body: payload,
  });
  check("webhook accepts a valid signature", goodSig.status === 200, `got ${goodSig.status}`);

  const afterCapture = await prisma.consultationBooking.findUnique({
    where: { id: booking.id },
    include: { slot: true, payments: true },
  });
  check("booking is confirmed", afterCapture.status === "CONFIRMED", afterCapture.status);
  check("slot is booked", afterCapture.slot.status === "BOOKED", afterCapture.slot.status);
  check("hold is cleared", afterCapture.slot.heldUntil === null);
  check("payment is marked paid", afterCapture.payments[0].status === "PAID");
  check("paidAt is stamped", afterCapture.payments[0].paidAt instanceof Date);

  // Razorpay retries; a repeat delivery must not double-confirm.
  const replay = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": "smoke-evt-1",
    },
    body: payload,
  });
  const replayBody = await replay.json();
  check("replayed webhook is deduped", replay.status === 200 && replayBody.deduped === true);

  const paymentCount = await prisma.payment.count({ where: { razorpayOrderId: orderId } });
  check("no duplicate payment rows", paymentCount === 1, String(paymentCount));

  // A late failure notice must never undo a capture.
  const failPayload = JSON.stringify({
    event: "payment.failed",
    payload: {
      payment: { entity: { id: "pay_smoke_1", order_id: orderId, error_description: "late" } },
    },
  });
  const failSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(failPayload).digest("hex");
  await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": failSig,
      "x-razorpay-event-id": "smoke-evt-2",
    },
    body: failPayload,
  });
  const stillPaid = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
  check("a late failure does not undo a capture", stillPaid.status === "PAID", stillPaid.status);

  // -------------------------------------------------------------------------
  section("Confirmation page and calendar");

  const confirmation = await fetch(`${BASE}/confirmation/CON-SMOKE`);
  const confirmationHtml = await confirmation.text();
  check("confirmation page renders", confirmation.status === 200, `got ${confirmation.status}`);
  check("shows the reference", confirmationHtml.includes("CON-SMOKE"));
  check("shows a confirmed state", confirmationHtml.includes("consultation is booked"));

  const ics = await fetch(`${BASE}/api/calendar/CON-SMOKE.ics`);
  const icsBody = await ics.text();
  check("calendar file is served", ics.status === 200, `got ${ics.status}`);
  check(
    "calendar is well formed",
    icsBody.startsWith("BEGIN:VCALENDAR") && icsBody.trimEnd().endsWith("END:VCALENDAR"),
  );
  check("calendar has one event", (icsBody.match(/BEGIN:VEVENT/g) ?? []).length === 1);
  check("calendar uses CRLF line endings", icsBody.includes("\r\n"));
  check(
    "no calendar line exceeds 75 octets",
    icsBody.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75),
  );

  const unknownIcs = await fetch(`${BASE}/api/calendar/CON-NOTREAL.ics`);
  check("calendar 404s on an unknown reference", unknownIcs.status === 404);

  // -------------------------------------------------------------------------
  section("Downloads and entitlement");

  const publicDl = await postJson("/api/downloads", {
    resourceSlug: "paper-reading-list",
    email: "smoke-dl@example.com",
  });
  check("public file is released", publicDl.status === 200, `got ${publicDl.status}`);
  check("returns a file url", publicDl.json.url?.endsWith(".pdf"), publicDl.json.url);

  const captured = await prisma.subscriber.findUnique({
    where: { email: "smoke-dl@example.com" },
  });
  check("public download captures the lead", Boolean(captured));

  const gatedNoRef = await postJson("/api/downloads", {
    resourceSlug: "rag-evaluation-checklist",
    email: "smoke-dl@example.com",
  });
  check("gated file is refused without a reference", gatedNoRef.status === 403, `got ${gatedNoRef.status}`);

  const gatedWrongEmail = await postJson("/api/downloads", {
    resourceSlug: "rag-evaluation-checklist",
    email: "someone-else@example.com",
    reference: "CON-SMOKE",
  });
  check(
    "gated file is refused when the email does not match the reference",
    gatedWrongEmail.status === 403,
    `got ${gatedWrongEmail.status}`,
  );

  const gatedOk = await postJson("/api/downloads", {
    resourceSlug: "rag-evaluation-checklist",
    email: intake.email,
    reference: "CON-SMOKE",
  });
  check("gated file is released to the right pair", gatedOk.status === 200, `got ${gatedOk.status}`);

  const enrolledOnly = await postJson("/api/downloads", {
    resourceSlug: "cohort-workbook",
    email: intake.email,
    reference: "CON-SMOKE",
  });
  check(
    "a consultation does not unlock enrolled-only material",
    enrolledOnly.status === 403,
    `got ${enrolledOnly.status}`,
  );

  const files = await Promise.all(
    ["paper-reading-list", "research-cohort-syllabus", "cohort-workbook"].map((slug) =>
      fetch(`${BASE}/downloads/${slug}.pdf`),
    ),
  );
  check(
    "PDFs are actually served",
    files.every((response) => response.status === 200),
    files.map((f) => f.status).join(","),
  );
  const firstPdf = Buffer.from(await files[0].arrayBuffer());
  check("served file is a real PDF", firstPdf.subarray(0, 5).toString() === "%PDF-");

  // -------------------------------------------------------------------------
  section("Admin is closed by default");

  for (const path of ["/admin", "/admin/bookings", "/admin/slots", "/admin/people"]) {
    const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    check(
      `${path} redirects to sign-in`,
      response.status >= 300 && response.status < 400 && location.includes("/admin/login"),
      `${response.status} → ${location}`,
    );
  }

  // -------------------------------------------------------------------------
  section("Public pages");

  for (const path of ["/", "/consultation", "/programs/research-cohort", "/programs/genai-ecosystem", "/resources", "/about", "/contact", "/terms", "/privacy", "/refunds"]) {
    const response = await fetch(`${BASE}${path}`);
    check(`${path} renders`, response.status === 200, `got ${response.status}`);
  }

  const missingProgram = await fetch(`${BASE}/programs/not-a-program`);
  check("unknown programme 404s", missingProgram.status === 404, `got ${missingProgram.status}`);

  // -------------------------------------------------------------------------
  section("Expired holds are reaped");

  const staleSlot = await prisma.availabilitySlot.findFirst({
    where: { status: "OPEN", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "desc" },
  });
  await prisma.availabilitySlot.update({
    where: { id: staleSlot.id },
    data: { status: "HELD", heldUntil: new Date(Date.now() - 60_000) },
  });
  const staleBooking = await prisma.consultationBooking.create({
    data: {
      reference: "CON-STALE",
      personId: person.id,
      slotId: staleSlot.id,
      amountPaise: 49_900,
    },
  });

  await fetch(`${BASE}/consultation`); // reading availability triggers the sweep

  const reaped = await prisma.availabilitySlot.findUnique({ where: { id: staleSlot.id } });
  const reapedBooking = await prisma.consultationBooking.findUnique({
    where: { id: staleBooking.id },
  });
  check("expired hold returns to the pool", reaped.status === "OPEN", reaped.status);
  check("its booking is cancelled", reapedBooking.status === "CANCELLED", reapedBooking.status);

  // A released slot must be bookable again — the retry case that a unique
  // constraint on slotId would have broken.
  const rebooked = await prisma.consultationBooking.create({
    data: {
      reference: "CON-RETRY",
      personId: person.id,
      slotId: staleSlot.id,
      amountPaise: 49_900,
    },
  });
  check("a released slot can be booked again", Boolean(rebooked.id));

  await prisma.consultationBooking.deleteMany({
    where: { reference: { in: ["CON-STALE", "CON-RETRY"] } },
  });

  // -------------------------------------------------------------------------
  section("Rate limiting");

  const burst = await Promise.all(
    Array.from({ length: 14 }, () =>
      postJson("/api/subscribe", { email: `burst${Math.random()}@example.com` }),
    ),
  );
  check(
    "subscribe endpoint throttles a burst",
    burst.some((response) => response.status === 429),
    burst.map((r) => r.status).join(","),
  );

  await cleanup();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
