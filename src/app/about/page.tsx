import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { InstagramIcon, LinkedInIcon } from "@/components/icons";
import { FounderCard } from "@/components/founder-card";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why these programmes are live, small and paper-first — and how the sessions actually run.",
};

export default function AboutPage() {
  return (
    <div className="container-page py-14 lg:py-20 max-w-3xl">
      <p className="eyebrow">About</p>
      <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
        Live, small, and honest about what is hard
      </h1>

      <div className="mt-8 space-y-6 prose-body text-[1.0625rem]">
        <p>
          There is no shortage of generative AI content. There is a shortage of settings where you
          can ask a question mid-explanation, be wrong out loud, and have someone look at your
          actual code. That is the gap these programmes are built for.
        </p>
        <p>
          Everything here is live. Not a recorded course with a chat channel bolted on — live
          sessions on Google Meet or Zoom, small enough that everyone speaks. The research cohort
          caps at 16 and the ecosystem batch at 25, and those caps are not a marketing device: past
          them, the format stops working.
        </p>
        <p>
          The technical track is paper-first because the field moves faster than any curriculum can
          track. If you can read a paper properly — find the setup, read the ablations, work out
          what the authors are quietly not claiming — you stay current on your own. If you can
          only follow tutorials, you are always six months behind and you cannot tell which six
          months.
        </p>
        <p>
          The ecosystem track exists because most people who need this are not going to become
          engineers, and pretending otherwise wastes their time. It goes deep on judgement:
          what these systems can be trusted with, how to test their output, what it costs, and
          what leaves your building. No maths, no apologies for that.
        </p>
      </div>

      <h2 className="text-2xl font-semibold mt-14">Who runs it</h2>
      <p className="prose-body mt-3">
        These are taught by people who build with this technology, not by full-time trainers
        working from someone else&apos;s slides. That is the whole reason the sessions are live and
        the groups are small — you are paying for the questions you get to ask, not the material.
      </p>
      <div className="mt-6">
        <FounderCard />
      </div>

      <h2 className="text-2xl font-semibold mt-14">How a session actually runs</h2>
      <ul className="mt-5 space-y-4">
        <Item title="You get the link before, not during">
          The joining link lives on your confirmation page and goes out by email. No hunting
          through a chat thread five minutes before start.
        </Item>
        <Item title="Cameras optional, participation not">
          You will be asked things. In a group this size, nobody gets to be an anonymous
          attendee — that is the whole point of paying for live.
        </Item>
        <Item title="Recordings for the ecosystem batch, not the research cohort">
          Ecosystem sessions are recorded and posted within 24 hours. Research sessions are not,
          because people work on real code from real employers in them.
        </Item>
        <Item title="Material stays yours">
          Syllabus, workbook, starter repository and reading list remain available after the
          cohort ends, behind your booking reference.
        </Item>
      </ul>

      <div className="card p-7 mt-14">
        <h2 className="text-xl font-semibold">Talk to us first</h2>
        <p className="prose-body mt-2">
          If you are unsure which track fits — or whether either does — the 30-minute
          consultation is the cheapest way to find out. We would rather tell you to skip both than
          take money for the wrong one.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link href="/consultation" className="btn btn-primary">
            Book a consultation
          </Link>
          <a href={`mailto:${site.email}`} className="btn btn-secondary">
            Email {site.email}
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-10">
        <span className="text-sm text-faint">Follow along:</span>
        <a
          href={site.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary text-sm py-2"
        >
          <InstagramIcon className="h-4 w-4" />
          Instagram
        </a>
        <a
          href={site.social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary text-sm py-2"
        >
          <LinkedInIcon className="h-4 w-4" />
          LinkedIn
        </a>
      </div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="prose-body text-sm mt-1.5">{children}</p>
    </li>
  );
}
