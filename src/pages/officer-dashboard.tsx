import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OfficerProfileCard } from "@/components/officer/officer-profile-card";
import { Button } from "@/components/ui/button";
import { buildOfficerProfile } from "@/lib/officer-profile";

export default function OfficerDashboardPage() {
  const { officerId } = useParams();
  const [searchParams] = useSearchParams();
  const [brandLight, setBrandLight] = useState({ x: 0, y: 0, active: false });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const district = searchParams.get("district") ?? "Unknown District";
  const profile = buildOfficerProfile(officerId);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050d24] text-foreground">
      <header className="absolute inset-x-0 top-0 z-[1000] border-b border-blue-400/25 bg-[#0f2f80]/20 backdrop-blur-[2px]">
        <nav className="flex h-16 items-center justify-between px-4 md:px-6">
          <div
            className={`bpd-brand ${brandLight.active ? "is-active" : ""}`}
            aria-label="BPD Profiles"
            style={
              {
                "--brand-halo-x": `${brandLight.x}px`,
                "--brand-halo-y": `${brandLight.y}px`,
              } as CSSProperties
            }
            onMouseEnter={() => setBrandLight((prev) => ({ ...prev, active: true }))}
            onMouseLeave={() => setBrandLight({ x: 0, y: 0, active: false })}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const normalizedX = (event.clientX - centerX) / (rect.width / 2);
              const normalizedY = (event.clientY - centerY) / (rect.height / 2);

              setBrandLight({
                x: -normalizedX * 14,
                y: -normalizedY * 10,
                active: true,
              });
            }}
          >
            <span className="bpd-brand-text">BPD Profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button className="border border-blue-300/45 bg-[#0f2f80]/70 text-[#c7d8ff] shadow-[0_0_8px_rgba(47,125,255,0.32)] transition-all duration-300 ease-out hover:scale-105 hover:bg-[#1d56d8]/80 hover:text-[#e2ecff] hover:shadow-[0_0_12px_rgba(59,130,246,0.45)]">
                Map
              </Button>
            </Link>
            <Button className="border border-blue-300/45 bg-[#1a3f9b]/65 text-[#c9dcff] shadow-[0_0_8px_rgba(37,99,235,0.3)] transition-all duration-300 ease-out hover:scale-105 hover:bg-[#2f7dff]/75 hover:text-[#edf3ff] hover:shadow-[0_0_12px_rgba(96,165,250,0.42)]">
              Officers
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 pb-8 pt-24 md:px-8">
        <div className="flex min-h-[calc(100vh-7rem)] items-stretch gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-cyan-200/80">
                  Officer Profile
                </p>
                <h1 className="mb-1 text-2xl font-semibold text-[#e4efff]">{profile.name}</h1>
                <p className="text-sm text-[#afc2ea]">{district}</p>
              </div>
              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={() => setIsChatOpen((prev) => !prev)}
                  aria-label={isChatOpen ? "Close chat" : "Open chat"}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cyan-300/45 bg-[#122359]/90 text-[#d7e7ff] shadow-[0_0_8px_rgba(56,189,248,0.32)] transition-all duration-300 ease-out hover:scale-110 hover:bg-[#1a2f75]"
                >
                  {isChatOpen ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 6l12 12" />
                      <path d="M18 6 6 18" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" />
                      <path d="M18.5 14.5l.9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              <OfficerProfileCard
                officerId={officerId ?? "officer"}
                district={district}
                showOpenProfileLink={false}
                className="transition-transform duration-300 ease-out hover:scale-[1.02]"
              />

              <div className="rounded-lg border border-cyan-300/28 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(56,189,248,0.3)] transition-transform duration-300 ease-out hover:scale-[1.02]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#9cb6ea]">
                  Civilian Complaints Percentile
                </p>
                <p className="mt-2 text-3xl font-semibold text-[#dff3ff]">
                  {profile.complaintsPercentile.toFixed(1)}
                </p>
                <p className="mt-1 text-sm text-[#b8caec]">Compared with other BPD officers</p>
                <div className="mt-3 h-2 w-full rounded-full bg-[#0a1433]/90">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                    style={{ width: `${profile.complaintsPercentile}%` }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-purple-300/28 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(147,51,234,0.3)] transition-transform duration-300 ease-out hover:scale-[1.02]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#b4acef]">
                  Overtime Logged Percentile
                </p>
                <p className="mt-2 text-3xl font-semibold text-[#f0e8ff]">
                  {profile.overtimePercentile.toFixed(1)}
                </p>
                <p className="mt-1 text-sm text-[#cbc2f2]">Compared with other BPD officers</p>
                <div className="mt-3 h-2 w-full rounded-full bg-[#0a1433]/90">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                    style={{ width: `${profile.overtimePercentile}%` }}
                  />
                </div>
              </div>
            </section>

            <Link
              to="/"
              className="mt-6 inline-flex rounded-md border border-cyan-300/45 bg-[#122359]/90 px-4 py-2 text-sm text-[#d7e7ff] shadow-[0_0_8px_rgba(56,189,248,0.3)] transition-colors hover:bg-[#1a2f75]"
            >
              Back to Map
            </Link>
          </div>

          <aside
            className={`${
              isChatOpen
                ? "w-[360px] min-w-[320px] translate-x-0 opacity-100"
                : "w-0 min-w-0 translate-x-8 opacity-0"
            } max-w-[45vw] self-stretch overflow-hidden rounded-lg border bg-[#101b45]/86 shadow-[0_0_10px_rgba(56,189,248,0.3)] transition-all duration-300 ease-out ${
              isChatOpen
                ? "pointer-events-auto border-cyan-300/35 p-4"
                : "pointer-events-none border-transparent p-0"
            }`}
          >
            <div className="relative flex h-full flex-col">
              <div className="mb-3">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200/85">
                  Officer Chat
                </p>
              </div>
              <div className="min-h-[220px] flex-1 rounded-md border border-blue-300/25 bg-[#040a1f]/95 p-3 text-sm text-[#b9cff7]">
                Chat window ready. Hook this up to your AI/backend when you are ready.
              </div>
              <button
                type="button"
                className="mt-3 mb-2 inline-flex w-fit items-center gap-1 rounded-md border border-cyan-300/35 bg-[#081433] px-2.5 py-1 text-xs uppercase tracking-[0.1em] text-cyan-200/85 transition-all duration-300 ease-out hover:scale-105 hover:bg-[#10224f]"
              >
                Gemini
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 7 5 6 5-6" />
                </svg>
              </button>
              <div className="flex items-end gap-2">
                <input
                  className="h-11 flex-1 rounded-md border border-cyan-300/30 bg-[#020718] px-3 text-sm text-[#eaf2ff] placeholder:text-[#7f99cc] focus:outline-none"
                  placeholder="Type your question about this officer..."
                />
                <button
                  type="button"
                  aria-label="Send message"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/45 bg-[#15347e] text-[#e5f0ff] shadow-[0_0_8px_rgba(56,189,248,0.35)] transition-all duration-300 ease-out hover:scale-115 hover:bg-[#20479f]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14" />
                    <path d="m7 10 5-5 5 5" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
