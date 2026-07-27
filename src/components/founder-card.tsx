import { founder } from "@/lib/site";
import { LinkedInIcon } from "./icons";

/// Initials stand in for a photograph until there is one. A real headshot is
/// worth adding — drop it in /public and swap the block below for an <Image>.
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function FounderCard({ heading }: { heading?: string }) {
  return (
    <div className="card p-7">
      {heading && <p className="eyebrow mb-4">{heading}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-dim text-accent font-semibold text-lg"
        >
          {initials(founder.name)}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{founder.name}</h3>
          <p className="text-sm text-faint">{founder.role}</p>
        </div>
        <a
          href={founder.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary text-sm py-2 sm:ml-auto"
        >
          <LinkedInIcon className="h-4 w-4" />
          LinkedIn
        </a>
      </div>

      {founder.bio && <p className="prose-body mt-5">{founder.bio}</p>}
    </div>
  );
}
