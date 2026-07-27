import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { InstagramIcon, LinkedInIcon } from "@/components/icons";
import { SubscribeForm } from "@/components/subscribe-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach us about a booking, a refund, or corporate training.",
};

export default function ContactPage() {
  return (
    <div className="container-page py-14 lg:py-20 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-semibold">Contact</h1>
      <p className="prose-body text-lg mt-4">
        One inbox, read by a person, usually answered within a working day.
      </p>

      <div className="card p-7 mt-9">
        <h2 className="text-xl font-semibold">Email</h2>
        <a
          href={`mailto:${site.email}`}
          className="text-accent text-lg hover:underline mt-2 inline-block"
        >
          {site.email}
        </a>
        <p className="prose-body text-sm mt-4">
          If it is about an existing booking, put your reference — the{" "}
          <span className="font-mono">CON-</span> or <span className="font-mono">ENR-</span> code
          from your confirmation page — in the subject line. It saves a round trip.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <a
          href={site.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-6 hover:border-faint transition-colors"
        >
          <InstagramIcon className="h-5 w-5 text-accent" />
          <h2 className="font-semibold mt-3">Instagram</h2>
          <p className="prose-body text-sm mt-1">
            Session clips, paper breakdowns, and cohort dates as they open.
          </p>
        </a>
        <a
          href={site.social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-6 hover:border-faint transition-colors"
        >
          <LinkedInIcon className="h-5 w-5 text-accent" />
          <h2 className="font-semibold mt-3">LinkedIn</h2>
          <p className="prose-body text-sm mt-1">
            Longer write-ups, alumni work, and corporate training enquiries.
          </p>
        </a>
      </div>

      <div className="card p-7 mt-5">
        <h2 className="text-xl font-semibold">Training a team?</h2>
        <p className="prose-body mt-2">
          Both programmes can run privately for a single organisation, with the examples rebuilt
          around your own systems and data. Email us with roughly how many people, their
          backgrounds, and what you are trying to get them able to do.
        </p>
        <Link href="/consultation" className="btn btn-secondary mt-5">
          Or start with a consultation
        </Link>
      </div>

      <div className="card p-7 mt-5">
        <h2 className="text-xl font-semibold">Cohort alerts</h2>
        <p className="prose-body mt-2 mb-5">
          One email when a new cohort or batch opens. Seats go to this list first.
        </p>
        <div className="max-w-sm">
          <SubscribeForm source="contact" />
        </div>
      </div>
    </div>
  );
}
