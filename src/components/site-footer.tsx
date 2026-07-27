import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";
import { InstagramIcon, LinkedInIcon } from "./icons";
import { SubscribeForm } from "./subscribe-form";

export function SiteFooter() {
  return (
    <footer className="border-t border-line-soft mt-24">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-7 w-7" />
              <span className="font-semibold tracking-tight">{site.name}</span>
            </div>
            <p className="prose-body text-sm mt-3 max-w-sm">
              Live generative AI training in small groups. Sessions run on Google Meet or
              Zoom; everything around them — booking, intake, materials — lives here.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-line text-muted hover:text-text hover:border-faint transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href={site.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-line text-muted hover:text-text hover:border-faint transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
              <a
                href={`mailto:${site.email}`}
                className="text-sm text-muted hover:text-text transition-colors"
              >
                {site.email}
              </a>
            </div>
          </div>

          <nav aria-label="Programmes">
            <h2 className="text-sm font-semibold mb-3">Programmes</h2>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/consultation">30-min consultation</FooterLink>
              <FooterLink href="/programs/research-cohort">Research cohort</FooterLink>
              <FooterLink href="/programs/genai-ecosystem">Gen AI ecosystem</FooterLink>
              <FooterLink href="/resources">Downloads</FooterLink>
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-semibold mb-3">Next cohort alerts</h2>
            <p className="text-sm text-faint mb-3">
              One email when a new cohort or batch opens. Nothing else.
            </p>
            <SubscribeForm source="footer" />
          </div>
        </div>

        <div className="hairline mt-12 pt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm text-faint">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/terms" className="hover:text-text transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-text transition-colors">
              Privacy
            </Link>
            <Link href="/refunds" className="hover:text-text transition-colors">
              Refunds &amp; rescheduling
            </Link>
            <Link href="/contact" className="hover:text-text transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-muted hover:text-text transition-colors">
        {children}
      </Link>
    </li>
  );
}
