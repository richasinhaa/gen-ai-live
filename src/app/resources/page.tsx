import type { Metadata } from "next";
import { ResourceAudience } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DownloadCard } from "./download-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Syllabi, the paper reading list, and the RAG evaluation checklist. Free material is open; cohort material needs your booking reference.",
};

const AUDIENCE_COPY: Record<ResourceAudience, string> = {
  PUBLIC: "Free — we just ask for an email",
  CONSULTATION: "For consultation clients",
  ENROLLED: "For enrolled learners",
};

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: [{ audience: "asc" }, { sortOrder: "asc" }],
    include: { program: { select: { title: true } } },
  });

  const groups = [
    ResourceAudience.PUBLIC,
    ResourceAudience.CONSULTATION,
    ResourceAudience.ENROLLED,
  ]
    .map((audience) => ({
      audience,
      items: resources.filter((resource) => resource.audience === audience),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="container-page py-14 lg:py-20">
      <p className="eyebrow">Downloads</p>
      <h1 className="text-3xl sm:text-4xl font-semibold mt-3">Take the detail with you</h1>
      <p className="prose-body text-lg mt-4 max-w-2xl">
        Full syllabi and the reading list are open — give us an email and the file is yours.
        Cohort material needs the reference from your confirmation page, plus the email you booked
        with.
      </p>

      <div className="mt-12 space-y-12">
        {groups.map((group) => (
          <section key={group.audience}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
              {AUDIENCE_COPY[group.audience]}
            </h2>
            <div className="grid md:grid-cols-2 gap-5 mt-5">
              {group.items.map((resource) => (
                <DownloadCard
                  key={resource.id}
                  resource={{
                    slug: resource.slug,
                    title: resource.title,
                    description: resource.description,
                    audience: resource.audience,
                    programTitle: resource.program?.title ?? null,
                    fileType: resource.fileType,
                    sizeLabel: resource.sizeLabel,
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
