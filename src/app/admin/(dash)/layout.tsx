import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Consultations" },
  { href: "/admin/cohorts", label: "Cohorts" },
  { href: "/admin/slots", label: "Availability" },
  { href: "/admin/people", label: "People" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Instructor console</h1>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary text-sm py-2">
            Sign out
          </button>
        </form>
      </div>

      <nav className="flex gap-1 mt-6 border-b border-line overflow-x-auto" aria-label="Admin">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2.5 text-sm text-muted hover:text-text border-b-2 border-transparent hover:border-line whitespace-nowrap transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
