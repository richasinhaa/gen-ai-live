import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { subscribeSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "subscribe"), { limit: 10, windowMs: 10 * 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts, try later." }, { status: 429 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That email doesn't look right" }, { status: 400 });
  }

  const { email, name, interest, source } = parsed.data;
  // Re-subscribing updates the context but never resurfaces as a duplicate.
  await prisma.subscriber.upsert({
    where: { email },
    create: { email, name, interest, source },
    update: { name, interest, source },
  });

  return NextResponse.json({ ok: true });
}
