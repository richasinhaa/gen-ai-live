export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-14 lg:py-20 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-semibold">{title}</h1>
      <p className="text-sm text-faint mt-2">Last updated {updated}</p>
      <div className="mt-10 space-y-8">{children}</div>
    </div>
  );
}

export function Clause({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <div className="prose-body mt-2.5 space-y-3">{children}</div>
    </section>
  );
}

/// Shown on every legal page: these documents are a starting point written for
/// a specific business, and they need a lawyer's eyes before they carry weight.
export function ReviewNotice() {
  return (
    <p className="card p-4 text-sm text-faint">
      These terms describe how we intend to operate. Before you rely on them commercially — and
      before submitting them for payment-gateway verification — have them reviewed against your
      registered entity details and the law that applies to you.
    </p>
  );
}
