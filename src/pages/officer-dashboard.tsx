import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OfficerProfileCard } from "@/components/officer/officer-profile-card";
import { Button } from "@/components/ui/button";
import { buildOfficerProfile } from "@/lib/officer-profile";
import { fetchOfficerProfile, parseEmployeeId } from "@/lib/api";

type PayrollYearPoint = {
  year: number;
  overtimeHours: number;
  baseSalary: number;
  totalSalary: number;
  complaints: number;
};

type OfficerAnalytics = {
  payroll: PayrollYearPoint[];
  outcomes: {
    consequence: number;
    dismissed: number;
  };
};

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function toCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function makeLinePoints(
  values: number[],
  width: number,
  height: number,
  leftPadding: number,
  topPadding: number,
  rightPadding: number,
  bottomPadding: number,
) {
  if (!values.length) {
    return "";
  }
  const plotWidth = width - leftPadding - rightPadding;
  const plotHeight = height - topPadding - bottomPadding;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x = leftPadding + (index / Math.max(1, values.length - 1)) * plotWidth;
      const normalizedY = (value - minValue) / range;
      const y = topPadding + (1 - normalizedY) * plotHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildOfficerAnalytics(officerId: string | undefined): OfficerAnalytics {
  const seed = hashString(officerId ?? "officer");
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const baseSalaryStart = 76000 + (seed % 14000);
  const salaryStep = 1700 + ((seed >>> 3) % 750);
  const overtimeRate = 56 + ((seed >>> 4) % 12);

  const payroll = years.map((year, index) => {
    const wave = Math.sin((index + (seed % 5)) / 1.7);
    const overtimeHours = Math.max(120, Math.round(220 + wave * 55 + index * 14));
    const baseSalary = Math.round(baseSalaryStart + index * salaryStep);
    const totalSalary = Math.round(baseSalary + overtimeHours * overtimeRate);
    const complaints = Math.max(0, Math.round(2 + ((seed >>> (index + 2)) % 6) - index * 0.2));

    return {
      year,
      overtimeHours,
      baseSalary,
      totalSalary,
      complaints,
    };
  });

  const totalComplaints = payroll.reduce((sum, point) => sum + point.complaints, 0);
  const consequence = Math.max(1, Math.round(totalComplaints * (0.22 + ((seed % 9) / 100))));
  const dismissed = Math.max(1, totalComplaints - consequence);

  return {
    payroll,
    outcomes: {
      consequence,
      dismissed,
    },
  };
}

export default function OfficerDashboardPage() {
  const { officerId } = useParams();
  const [searchParams] = useSearchParams();
  const [brandLight, setBrandLight] = useState({ x: 0, y: 0, active: false });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [liveOfficerName, setLiveOfficerName] = useState<string | null>(null);
  const [liveDistrict, setLiveDistrict] = useState<string | null>(null);
  const [liveComplaintsTotal, setLiveComplaintsTotal] = useState<number | null>(null);
  const [liveOvertimePayTotal, setLiveOvertimePayTotal] = useState<number | null>(null);
  const [liveComplaintsPercentile, setLiveComplaintsPercentile] = useState<number | null>(null);
  const [liveOvertimePercentile, setLiveOvertimePercentile] = useState<number | null>(null);
  const district = liveDistrict ?? searchParams.get("district") ?? "Unknown District";
  const routeOfficerName = searchParams.get("name");
  const profile = buildOfficerProfile(officerId);
  const analytics = useMemo(() => buildOfficerAnalytics(officerId), [officerId]);
  const payrollYears = analytics.payroll.map((point) => point.year);
  const baseSalarySeries = analytics.payroll.map((point) => point.baseSalary);
  const totalSalarySeries = analytics.payroll.map((point) => point.totalSalary);
  const overtimeSeries = analytics.payroll.map((point) => point.overtimeHours * 1000);
  const complaintsSeries = analytics.payroll.map((point) => point.complaints);
  const salaryChartWidth = 640;
  const salaryChartHeight = 220;
  const lineChartPadding = { left: 36, top: 14, right: 16, bottom: 24 };
  const salaryBasePoints = makeLinePoints(
    baseSalarySeries,
    salaryChartWidth,
    salaryChartHeight,
    lineChartPadding.left,
    lineChartPadding.top,
    lineChartPadding.right,
    lineChartPadding.bottom,
  );
  const salaryTotalPoints = makeLinePoints(
    totalSalarySeries,
    salaryChartWidth,
    salaryChartHeight,
    lineChartPadding.left,
    lineChartPadding.top,
    lineChartPadding.right,
    lineChartPadding.bottom,
  );
  const overtimePoints = makeLinePoints(
    overtimeSeries,
    salaryChartWidth,
    salaryChartHeight,
    lineChartPadding.left,
    lineChartPadding.top,
    lineChartPadding.right,
    lineChartPadding.bottom,
  );
  const complaintsChartWidth = 640;
  const complaintsChartHeight = 210;
  const complaintsPoints = makeLinePoints(
    complaintsSeries,
    complaintsChartWidth,
    complaintsChartHeight,
    36,
    14,
    16,
    24,
  );
  const mockComplaintsTotal = analytics.outcomes.consequence + analytics.outcomes.dismissed;
  const consequenceRatio = mockComplaintsTotal > 0 ? analytics.outcomes.consequence / mockComplaintsTotal : 0.35;
  const dismissedRatio = Math.max(0, 1 - consequenceRatio);
  const fallbackOvertimePay = analytics.payroll.reduce(
    (sum, point) => sum + (point.totalSalary - point.baseSalary),
    0,
  );
  const displayComplaintsTotal = liveComplaintsTotal ?? mockComplaintsTotal;
  const displayOvertimePay = liveOvertimePayTotal ?? fallbackOvertimePay;
  const displayComplaintsPercentile = liveComplaintsPercentile ?? profile.complaintsPercentile;
  const displayOvertimePercentile = liveOvertimePercentile ?? profile.overtimePercentile;
  const displayOutcomeConsequence = Math.max(0, Math.round(displayComplaintsTotal * consequenceRatio));
  const displayOutcomeDismissed = Math.max(0, displayComplaintsTotal - displayOutcomeConsequence);
  const consequencePct = displayComplaintsTotal > 0 ? (displayOutcomeConsequence / displayComplaintsTotal) * 100 : 0;
  const dismissedPct = displayComplaintsTotal > 0 ? (displayOutcomeDismissed / displayComplaintsTotal) * 100 : 0;

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function loadOfficer() {
      if (!officerId || !parseEmployeeId(officerId)) {
        return;
      }
      try {
        const data = await fetchOfficerProfile(officerId);
        if (isCancelled || !data) {
          return;
        }
        const firstName = data.officer.first_name?.trim() ?? "";
        const lastName = data.officer.last_name?.trim() ?? "";
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          setLiveOfficerName(fullName);
        }
        if (data.district?.patrol_district) {
          setLiveDistrict(data.district.patrol_district);
        }
        if (data.metrics?.complaints_total != null) {
          setLiveComplaintsTotal(data.metrics.complaints_total);
        }
        if (data.metrics?.overtime_pay_total != null) {
          setLiveOvertimePayTotal(data.metrics.overtime_pay_total);
        }
        if (data.metrics?.complaints_percentile != null) {
          setLiveComplaintsPercentile(data.metrics.complaints_percentile);
        }
        if (data.metrics?.overtime_ratio_percentile != null) {
          setLiveOvertimePercentile(data.metrics.overtime_ratio_percentile);
        }
      } catch {
        // Keep mock dashboard data as placeholder visuals.
      }
    }
    void loadOfficer();
    return () => {
      isCancelled = true;
    };
  }, [officerId]);

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
                <h1 className="mb-1 text-2xl font-semibold text-[#e4efff]">
                  {liveOfficerName ?? routeOfficerName ?? profile.name}
                </h1>
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
                  {displayComplaintsPercentile.toFixed(1)}
                </p>
                <p className="mt-1 text-sm text-[#b8caec]">
                  {displayComplaintsTotal} total complaints
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-[#0a1433]/90">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                    style={{ width: `${displayComplaintsPercentile}%` }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-purple-300/28 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(147,51,234,0.3)] transition-transform duration-300 ease-out hover:scale-[1.02]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#b4acef]">
                  Total Overtime Compensation
                </p>
                <p className="mt-2 text-3xl font-semibold text-[#f0e8ff]">
                  {toCurrency(displayOvertimePay)}
                </p>
                <p className="mt-1 text-sm text-[#cbc2f2]">
                  Overtime percentile: {displayOvertimePercentile.toFixed(1)}
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-[#0a1433]/90">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                    style={{ width: `${displayOvertimePercentile}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border border-blue-300/30 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(59,130,246,0.28)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#9cb6ea]">
                  Overtime vs Base and Total Salary
                </p>
                <p className="mt-1 text-xs text-[#afc3ea]">Mock trend across 2019-2025</p>
                <div className="mt-3 rounded-md border border-blue-300/20 bg-[#070f2b]/90 p-2">
                  <svg viewBox={`0 0 ${salaryChartWidth} ${salaryChartHeight}`} className="h-[220px] w-full">
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={salaryBasePoints}
                    />
                    <polyline
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={salaryTotalPoints}
                    />
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2.4"
                      strokeDasharray="6 5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={overtimePoints}
                    />
                  </svg>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="text-cyan-200">- Base Salary</span>
                  <span className="text-fuchsia-200">- Total Salary</span>
                  <span className="text-amber-200">- Overtime (scaled)</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#b8c9eb] sm:grid-cols-3">
                  <div>Latest base: <span className="text-[#d9ecff]">{toCurrency(baseSalarySeries.at(-1) ?? 0)}</span></div>
                  <div>Latest total: <span className="text-[#f2e8ff]">{toCurrency(totalSalarySeries.at(-1) ?? 0)}</span></div>
                  <div>OT hours: <span className="text-[#ffe6b7]">{analytics.payroll.at(-1)?.overtimeHours ?? 0}</span></div>
                </div>
              </article>

              <article className="rounded-lg border border-cyan-300/28 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(56,189,248,0.3)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#9cb6ea]">
                  Complaint Outcomes
                </p>
                <p className="mt-1 text-xs text-[#afc3ea]">Consequence vs dismissed</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-[#cce2ff]">
                      <span>Consequence</span>
                      <span>{displayOutcomeConsequence} ({consequencePct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-[#0a1433]/90">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                        style={{ width: `${consequencePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-[#e9dcff]">
                      <span>Dismissed</span>
                      <span>{displayOutcomeDismissed} ({dismissedPct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-[#0a1433]/90">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-fuchsia-400 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                        style={{ width: `${dismissedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section className="mt-4 rounded-lg border border-purple-300/28 bg-[#101b45]/86 p-4 shadow-[0_0_9px_rgba(147,51,234,0.3)]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#b4acef]">
                Complaints Received Over Time
              </p>
              <p className="mt-1 text-xs text-[#cbc2f2]">Count of complaints per year</p>
              <div className="mt-3 rounded-md border border-purple-300/20 bg-[#070f2b]/90 p-2">
                <svg viewBox={`0 0 ${complaintsChartWidth} ${complaintsChartHeight}`} className="h-[210px] w-full">
                  <polyline
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={complaintsPoints}
                  />
                </svg>
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-[#c8bcf1]">
                {payrollYears.map((year, index) => (
                  <span key={year}>
                    {year}: <span className="text-[#ece6ff]">{complaintsSeries[index]}</span>
                  </span>
                ))}
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
                  Ask Gemini
                </p>
              </div>
              <div className="min-h-[220px] flex-1 rounded-md border border-blue-300/25 bg-[#040a1f]/95 p-3 text-sm text-[#b9cff7]">
                <p className="text-[#d6e4ff]">Ask any questions about this officer.</p>
                <div className="mt-3 text-xs text-[#a7c0ef]">
                  <p className="uppercase tracking-[0.08em] text-cyan-200/80">Example prompts</p>
                  <ul className="mt-2 space-y-1 list-disc pl-5">
                    <li>Show me a visualization of this officer&apos;s overtime logging data over time compared to Officer B.</li>
                    <li>Summarize complaint trends for this officer over the past five years.</li>
                    <li>How does this officer&apos;s use-of-force history compare to their district average?</li>
                  </ul>
                </div>
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
