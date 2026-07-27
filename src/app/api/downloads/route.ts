import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { downloadSchema } from "@/lib/validation";
import { canDownload, entitlementsFor } from "@/lib/entitlements";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/// Hands back a file URL once the request is entitled to it, and logs the
/// download. The email becomes a lead; the log becomes the audit trail.
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "download"), { limit: 20, windowMs: 10 * 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many downloads, try later." }, { status: 429 });
  }

  const parsed = downloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the details and try again" }, { status: 400 });
  }
  const { resourceSlug, email, name, reference } = parsed.data;

  const resource = await prisma.resource.findUnique({ where: { slug: resourceSlug } });
  if (!resource || !resource.isActive) {
    return NextResponse.json({ error: "That file is not available" }, { status: 404 });
  }

  const entitlement = await entitlementsFor(reference, email);
  if (!canDownload(resource, entitlement)) {
    return NextResponse.json(
      {
        error:
          "This one is for consultation clients and enrolled learners. Enter the reference from your confirmation email.",
      },
      { status: 403 },
    );
  }

  const person = await prisma.person.findUnique({ where: { email }, select: { id: true } });

  // Store a salted hash rather than the address itself — enough to spot abuse,
  // not a stored identifier for everyone who downloaded a brochure.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "";
  const ipHash = ip
    ? crypto
        .createHash("sha256")
        .update(`${ip}${process.env.ADMIN_SESSION_SECRET ?? ""}`)
        .digest("hex")
        .slice(0, 32)
    : null;

  await prisma.downloadEvent.create({
    data: { resourceId: resource.id, personId: person?.id, email, ipHash },
  });

  // Public material doubles as a lead magnet — capture the address, quietly.
  if (resource.audience === "PUBLIC") {
    await prisma.subscriber.upsert({
      where: { email },
      create: { email, name, interest: resource.slug, source: "download" },
      update: { interest: resource.slug },
    });
  }

  return NextResponse.json({ url: resource.fileUrl, title: resource.title });
}
