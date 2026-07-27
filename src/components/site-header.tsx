import Link from "next/link";
import { Logo } from "./logo";

const NAV = [
  { href: "/programs/research-cohort", label: "Research cohort" },
  { href: "/programs/genai-ecosystem", label: "Gen AI ecosystem" },
  { href: "/resources", label: "Downloads" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-ink/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Gen AI Live home">
          <Logo className="h-7 w-7" />
          <span className="font-semibold tracking-tight">Gen AI Live</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted hover:text-text transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/consultation" className="btn btn-primary text-sm py-2 px-3.5 shrink-0">
          Book a consultation
        </Link>
      </div>

      {/* The desktop nav collapses on small screens; this keeps the same
          destinations reachable without a JS drawer. */}
      <nav
        className="md:hidden border-t border-line-soft overflow-x-auto"
        aria-label="Main, condensed"
      >
        <div className="container-page flex gap-5 py-2.5 whitespace-nowrap">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.8125rem] text-muted hover:text-text transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
