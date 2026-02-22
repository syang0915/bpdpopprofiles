import { Link, useParams, useSearchParams } from "react-router-dom";

export default function OfficerDashboardPage() {
  const { officerId } = useParams();
  const [searchParams] = useSearchParams();
  const district = searchParams.get("district") ?? "Unknown District";

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-cyan-300/35 bg-[#0a1433]/90 p-6 shadow-[0_0_24px_rgba(56,189,248,0.22)]">
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-cyan-200/80">
          Officer Dashboard
        </p>
        <h1 className="mb-1 text-2xl font-semibold text-[#d9e8ff]">
          {officerId?.replaceAll("-", " ") ?? "Officer"}
        </h1>
        <p className="mb-6 text-sm text-[#aebfdf]">{district}</p>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-cyan-300/25 bg-[#111a40]/80 p-4">
            <p className="text-xs uppercase tracking-wide text-[#90a9d6]">Status</p>
            <p className="mt-1 text-lg font-medium text-[#d2e5ff]">Active Duty</p>
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-[#111a40]/80 p-4">
            <p className="text-xs uppercase tracking-wide text-[#90a9d6]">Open Cases</p>
            <p className="mt-1 text-lg font-medium text-[#d2e5ff]">7</p>
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-[#111a40]/80 p-4">
            <p className="text-xs uppercase tracking-wide text-[#90a9d6]">Shift</p>
            <p className="mt-1 text-lg font-medium text-[#d2e5ff]">14:00 - 22:00</p>
          </div>
        </section>

        <Link
          to="/"
          className="mt-6 inline-flex rounded-md border border-cyan-300/50 bg-[#122359] px-4 py-2 text-sm text-[#d7e7ff] transition-colors hover:bg-[#1a2f75]"
        >
          Back to Map
        </Link>
      </div>
    </main>
  );
}
