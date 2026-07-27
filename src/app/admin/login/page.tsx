import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <div className="container-page py-24 max-w-sm">
      <h1 className="text-2xl font-semibold">Instructor sign-in</h1>
      <p className="prose-body text-sm mt-2">
        This area holds learner details. Do not sign in on a shared machine.
      </p>
      <LoginForm />
    </div>
  );
}
