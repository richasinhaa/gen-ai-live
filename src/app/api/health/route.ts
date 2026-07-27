import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/// Deployment health probe. Checks the database round-trips rather than just
/// that the process is up — a container that cannot reach Postgres serves
/// nothing useful, and should fail the check rather than take traffic.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up" });
  } catch (error) {
    console.error("health check failed", error);
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
