import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, PathOptions } from "leaflet";

import { PoliceDepartmentsLayer } from "@/components/map/police-departments-layer";
import { OfficerProfileCard } from "@/components/officer/officer-profile-card";
import { policeDepartments as fallbackDepartments } from "@/data/police-departments";
import { fetchDepartmentsSeverity, fetchPoliceDepartments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { PoliceDepartment } from "@/components/map/police-department-marker";
import policeDistrictsGeoJson from "../data/police_districts.json";

const bostonBounds: LatLngBoundsExpression = [
  [42.2279, -71.1912],
  [42.3969, -70.986],
];
const bostonCenter: [number, number] = [42.395, -71.0589];

type GeoFeature = {
  properties?: Record<string, unknown>;
};

type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type DistrictAnalytics = {
  districtCode: string;
  score: number;
  scoreLabel: string;
  topLocation: string | null;
  area: number | null;
};

function normalizeDistrictCode(value: string | null | undefined) {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getDistrictCodeFromProperties(properties: Record<string, unknown>) {
  const district =
    properties.DISTRICT ?? properties.ID ?? properties.district ?? properties.id ?? properties.Name;
  if (typeof district === "string" || typeof district === "number") {
    return normalizeDistrictCode(String(district));
  }
  return "";
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function hasDisplayableAddress(address: string | null | undefined) {
  if (!address) {
    return false;
  }
  const normalized = address.trim();
  if (!normalized) {
    return false;
  }
  return !/unavailable|unknown|n\/a|not available/i.test(normalized);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getSeverityStyle(normalizedScore: number, isHighlighted: boolean): PathOptions {
  const normalized = clamp01(normalizedScore);
  const visualScale = 1 - normalized;
  const hue = 195 + visualScale * 110; // violet -> cyan (flipped)
  const saturation = 88;
  const lightness = 52 - visualScale * 10;
  const fillOpacity = 0.18 + visualScale * 0.54;
  const strokeLightness = 68 - visualScale * 20;

  return {
    color: isHighlighted
      ? "hsla(198, 100%, 88%, 0.98)"
      : `hsla(${hue.toFixed(0)}, 92%, ${strokeLightness.toFixed(0)}%, 0.85)`,
    weight: isHighlighted ? 2.3 : 1.35,
    fillColor: `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness.toFixed(0)}%)`,
    fillOpacity: isHighlighted ? Math.min(0.92, fillOpacity + 0.1) : fillOpacity,
  };
}

function getSeverityBand(normalizedScore: number) {
  if (normalizedScore >= 0.67) {
    return "High";
  }
  if (normalizedScore >= 0.34) {
    return "Medium";
  }
  return "Low";
}

const OFFICER_RANK_ORDER = [
  "captain",
  "superintendent",
  "deputy",
  "lieutenant detective",
  "lieutenant",
  "sergeant detective",
  "sergeant",
  "detective",
  "police officer",
  "unknown",
] as const;

function normalizeOfficerRank(rank: string | null | undefined) {
  if (!rank) {
    return "unknown";
  }
  const compact = rank.toLowerCase().replace(/[^a-z]/g, "");

  if (compact.includes("captain")) {
    return "captain";
  }
  if (
    compact.includes("superintendent") ||
    compact === "depsup" ||
    compact.includes("deputysuperintendent")
  ) {
    return "superintendent";
  }
  if (compact === "deputy") {
    return "deputy";
  }
  if (compact.includes("lieutenant") || compact.includes("lieutenantenant") || compact === "lieut") {
    if (compact.includes("detective")) {
      return "lieutenant detective";
    }
    return "lieutenant";
  }
  if (compact.includes("sergeant")) {
    if (compact.includes("detective")) {
      return "sergeant detective";
    }
    return "sergeant";
  }
  if (compact.includes("detective")) {
    return "detective";
  }
  if (compact.includes("policeofficer") || compact === "officer") {
    return "police officer";
  }

  return "unknown";
}

function getOfficerRankPriority(rank: string | null | undefined) {
  const normalized = normalizeOfficerRank(rank);
  const index = OFFICER_RANK_ORDER.indexOf(normalized);
  return index === -1 ? OFFICER_RANK_ORDER.length - 1 : index;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickFallbackRank(officerId: string, officerName: string) {
  // Weighted distribution: Officer is common, senior roles are rarer.
  const roll = hashText(`${officerId}|${officerName}`) % 100;
  if (roll < 55) {
    return "Police Officer";
  }
  if (roll < 73) {
    return "Detective";
  }
  if (roll < 85) {
    return "Sergeant";
  }
  if (roll < 93) {
    return "Lieutenant";
  }
  if (roll < 98) {
    return "Captain";
  }
  return "Superintendent";
}

function withFallbackRanks(departments: PoliceDepartment[]) {
  return departments.map((department) => ({
    ...department,
    officers: department.officers.map((officer) => ({
      ...officer,
      rank:
        officer.rank?.trim() ||
        pickFallbackRank(officer.id ?? department.id, officer.name ?? "Officer"),
    })),
  }));
}

function LockInitialBostonView() {
  const map = useMap();

  useEffect(() => {
    map.setView(bostonCenter, 11);
    const initialZoom = map.getZoom();
    map.setMinZoom(initialZoom);
    map.setMaxBounds(bostonBounds);
    map.attributionControl.setPrefix(false);
  }, [map]);

  return null;
}

export default function App() {
  type OfficerFilterMode = "all" | "complaints" | "overtime";
  const [brandLight, setBrandLight] = useState({ x: 0, y: 0, active: false });
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<PoliceDepartment[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [officerFilterMode, setOfficerFilterMode] = useState<OfficerFilterMode>("all");
  const [sortOfficersByRank, setSortOfficersByRank] = useState(false);
  const [showSeverityRegions, setShowSeverityRegions] = useState(true);
  const [showSeverityInfo, setShowSeverityInfo] = useState(false);
  const [lastInsightsDepartmentId, setLastInsightsDepartmentId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadDepartments() {
      setIsLoadingDepartments(true);
      setDepartmentsError(null);
      try {
        let result = await fetchDepartmentsSeverity();
        if (!result.length) {
          result = await fetchPoliceDepartments({ delayMs: 260 });
        }
        if (isCancelled) {
          return;
        }
        setDepartments(withFallbackRanks(result));
      } catch {
        if (isCancelled) {
          return;
        }
        // Keep the UI working even if API is unavailable.
        setDepartments(withFallbackRanks(fallbackDepartments));
        setDepartmentsError("Mock API unavailable. Showing local fallback data.");
      } finally {
        if (!isCancelled) {
          setIsLoadingDepartments(false);
        }
      }
    }

    void loadDepartments();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleDepartmentHoverChange = (departmentId: string | null) => {
    setHoveredDepartmentId(departmentId);
  };

  const handleDepartmentToggle = (departmentId: string) => {
    setActiveDepartmentId((currentId) => (currentId === departmentId ? null : departmentId));
  };

  const markerHighlightDepartmentId = hoveredDepartmentId ?? activeDepartmentId;
  const insightsDepartmentId = hoveredDepartmentId ?? activeDepartmentId;
  const activeDepartment = departments.find((department) => department.id === activeDepartmentId);
  const insightsDepartment = departments.find((department) => department.id === insightsDepartmentId);
  useEffect(() => {
    if (insightsDepartmentId) {
      setLastInsightsDepartmentId(insightsDepartmentId);
    }
  }, [insightsDepartmentId]);
  const fadingInsightsDepartment = departments.find((department) => department.id === lastInsightsDepartmentId);
  const displayInsightsDepartment = insightsDepartment ?? fadingInsightsDepartment;
  const activeOrPreviewDepartmentId = hoveredDepartmentId ?? activeDepartmentId;
  const districtData = useMemo(() => {
    const featureCollection = policeDistrictsGeoJson as GeoFeatureCollection;
    const features = featureCollection.features ?? [];
    const fieldSamples =
      features.find((feature) => feature.properties && Object.keys(feature.properties).length)?.properties ?? {};
    const propertyKeys = Object.keys(fieldSamples);
    const arrestScoreKey =
      propertyKeys.find((key) => /arrest|incident|total|count|volume/i.test(key)) ?? "Shape_Area";
    const topLocationKey = propertyKeys.find((key) => /hotspot|location|street|area_name|neighborhood/i.test(key));

    const analyticsByDistrict = new Map<string, DistrictAnalytics>();
    for (const feature of features) {
      const properties = feature.properties ?? {};
      const districtCode = getDistrictCodeFromProperties(properties);
      if (!districtCode) {
        continue;
      }
      const score = toNumber(properties[arrestScoreKey]) ?? 0;
      const area = toNumber(properties.Shape_Area);
      const topLocation = topLocationKey ? toText(properties[topLocationKey]) : null;
      analyticsByDistrict.set(districtCode, {
        districtCode,
        score,
        scoreLabel: arrestScoreKey,
        topLocation,
        area,
      });
    }

    const allScores = [...analyticsByDistrict.values()].map((entry) => entry.score);
    const minScore = allScores.length ? Math.min(...allScores) : 0;
    const maxScore = allScores.length ? Math.max(...allScores) : 1;
    const scoreRange = Math.max(0.0001, maxScore - minScore);

    return {
      featureCollection,
      analyticsByDistrict,
      minScore,
      scoreRange,
    };
  }, []);
  const insightsDistrictCode = displayInsightsDepartment
    ? normalizeDistrictCode(displayInsightsDepartment.id)
    : null;
  const activeOrPreviewDistrictCode = activeOrPreviewDepartmentId
    ? normalizeDistrictCode(activeOrPreviewDepartmentId)
    : null;
  const insightsDistrictData = insightsDistrictCode
    ? districtData.analyticsByDistrict.get(insightsDistrictCode) ?? null
    : null;
  const insightsDistrictSeverityNormalized = insightsDistrictData
    ? clamp01((insightsDistrictData.score - districtData.minScore) / districtData.scoreRange)
    : null;
  const focusedFeatureCollection = useMemo<GeoFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (districtData.featureCollection.features ?? []).filter((feature) => {
        const properties = feature.properties ?? {};
        const districtCode = getDistrictCodeFromProperties(properties);
        return !!activeOrPreviewDistrictCode && districtCode === activeOrPreviewDistrictCode;
      }),
    }),
    [districtData.featureCollection, activeOrPreviewDistrictCode],
  );
  const visibleOfficers = useMemo(() => {
    if (!activeDepartment) {
      return [];
    }

    const filteredOfficers =
      officerFilterMode === "all"
        ? activeDepartment.officers
        : activeDepartment.officers
            .filter((officer) => {
              const metricKey =
                officerFilterMode === "complaints"
                  ? "complaints_percentile"
                  : "overtime_ratio_percentile";
              return (officer[metricKey] ?? -1) >= 75;
            })
            .sort((a, b) => {
              const metricKey =
                officerFilterMode === "complaints"
                  ? "complaints_percentile"
                  : "overtime_ratio_percentile";
              return (b[metricKey] ?? 0) - (a[metricKey] ?? 0);
            });

    if (!sortOfficersByRank) {
      return filteredOfficers;
    }

    return [...filteredOfficers].sort((a, b) => {
      const rankDiff = getOfficerRankPriority(a.rank) - getOfficerRankPriority(b.rank);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [activeDepartment, officerFilterMode, sortOfficersByRank]);

  const noOfficersMessage =
    officerFilterMode === "all"
      ? "No officers available for this district."
      : "No officers match this percentile filter.";

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-background text-foreground">
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

              // Move halo opposite cursor direction for a reflected-light look.
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
            <Button className="border border-blue-300/45 bg-[#0f2f80]/70 text-[#c7d8ff] shadow-[0_0_14px_rgba(47,125,255,0.28)] hover:bg-[#1d56d8]/80 hover:text-[#e2ecff] hover:shadow-[0_0_20px_rgba(59,130,246,0.45)]">
              Map
            </Button>
            <Button className="border border-blue-300/45 bg-[#1a3f9b]/65 text-[#c9dcff] shadow-[0_0_14px_rgba(37,99,235,0.26)] hover:bg-[#2f7dff]/75 hover:text-[#edf3ff] hover:shadow-[0_0_20px_rgba(96,165,250,0.42)]">
              Officers
            </Button>
          </div>
        </nav>
      </header>

      <main className="absolute inset-0">
        <MapContainer
          center={bostonCenter}
          zoom={11}
          maxZoom={18}
          maxBounds={bostonBounds}
          maxBoundsViscosity={1.0}
          zoomControl={false}
          className="cyberpunk-map h-full w-full"
        >
          <LockInitialBostonView />
          <TileLayer
            className="cyberpunk-base-layer"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains={["a", "b", "c", "d"]}
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          />
          <PoliceDepartmentsLayer
            departments={departments}
            activeDepartmentId={markerHighlightDepartmentId}
            onDepartmentToggle={handleDepartmentToggle}
            onDepartmentHoverChange={handleDepartmentHoverChange}
          />
          {showSeverityRegions ? (
            <GeoJSON
              data={districtData.featureCollection}
              style={(feature) => {
                const properties = feature?.properties as Record<string, unknown> | undefined;
                const districtCode = properties ? getDistrictCodeFromProperties(properties) : "";
                const analytics = districtData.analyticsByDistrict.get(districtCode);
                const normalized = analytics
                  ? (analytics.score - districtData.minScore) / districtData.scoreRange
                  : 0;
                return getSeverityStyle(normalized, false);
              }}
            />
          ) : null}
          {focusedFeatureCollection.features.length > 0 ? (
            <Pane name="severity-highlight" style={{ zIndex: 560 }}>
              <GeoJSON
                pane="severity-highlight"
                data={focusedFeatureCollection}
                style={() => ({
                  color: "hsla(198, 100%, 88%, 0.98)",
                  weight: 2.5,
                  fillColor: "hsla(201, 96%, 58%, 0.55)",
                  fillOpacity: 0.2,
                })}
              />
            </Pane>
          ) : null}
        </MapContainer>

        <div className="absolute left-4 top-20 z-[920] flex items-center gap-2 rounded-md border border-cyan-300/35 bg-[#07173f]/88 px-3 py-2 text-xs text-[#d4e5ff] backdrop-blur-sm">
          <input
            id="severity-regions-toggle"
            type="checkbox"
            checked={showSeverityRegions}
            onChange={(event) => setShowSeverityRegions(event.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-cyan-300"
          />
          <label htmlFor="severity-regions-toggle" className="cursor-pointer uppercase tracking-[0.08em]">
            Show Severity Regions
          </label>
        </div>

        <section
          className={`absolute bottom-4 left-4 z-[920] w-[340px] max-w-[90vw] rounded-lg border border-cyan-300/45 bg-[#07173f]/88 p-3 shadow-[0_0_14px_rgba(56,189,248,0.3)] backdrop-blur-sm transition-all duration-250 ease-out ${
            insightsDepartment ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {displayInsightsDepartment ? (
            <>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/75">
              District Insights (Local)
            </p>
            <h3 className="mt-1 text-base font-semibold text-[#e6efff]">
              {displayInsightsDepartment.district}
            </h3>
            {hasDisplayableAddress(displayInsightsDepartment.address) ? (
              <p className="mt-1 text-xs text-[#b7caee]">{displayInsightsDepartment.address}</p>
            ) : null}
            <p className="mt-2 text-xs text-[#cfe2ff]">
              <span className="text-[#9eb7e7]">Severity score:</span>{" "}
              {displayInsightsDepartment.mapping_score != null
                ? displayInsightsDepartment.mapping_score.toFixed(2)
                : "N/A"}
            </p>
            <p className="mt-1 text-xs text-[#cfe2ff]">
              <span className="text-[#9eb7e7]">Severity band:</span>{" "}
              {insightsDistrictSeverityNormalized != null
                ? `${getSeverityBand(insightsDistrictSeverityNormalized)} (${Math.round(insightsDistrictSeverityNormalized * 100)} / 100)`
                : "N/A"}
            </p>
            <button
              type="button"
              onClick={() => setShowSeverityInfo((current) => !current)}
              className="mt-2 inline-flex items-center gap-1 rounded border border-cyan-300/35 bg-[#0b173d]/65 px-2 py-1 text-[11px] text-cyan-100/90 transition-colors hover:bg-[#14295f]/80"
              aria-expanded={showSeverityInfo}
              aria-label="Toggle severity score info"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-200/60 text-[10px] font-semibold">
                i
              </span>
              Severity score details
            </button>
            {showSeverityInfo ? (
              <p className="mt-2 rounded border border-cyan-300/20 bg-[#0b173d]/55 px-2 py-2 text-[11px] leading-relaxed text-[#abc2ea]">
                Severity is based on disciplinary outcome: 0 = no consequence, 1 = verbal reprimand, 2
                = suspension up to 3 months, 3 = suspension over 3 months or termination.
              </p>
            ) : null}
            <div className="mt-3 space-y-2 rounded-md border border-blue-300/28 bg-[#0b173d]/72 p-2.5">
              <p className="text-xs text-[#cfe2ff]">
                <span className="text-[#9eb7e7]">Relative intensity metric:</span>{" "}
                {insightsDistrictData
                  ? `${insightsDistrictData.score.toFixed(6)} (${insightsDistrictData.scoreLabel})`
                  : "No local metric found for this district"}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#aac3ee]">
              <span>Severity:</span>
              <span className="text-cyan-200/85">Low</span>
              <span className="h-2.5 w-24 rounded border border-blue-200/30 bg-gradient-to-r from-fuchsia-500/75 via-blue-500/65 to-cyan-400/45" />
              <span className="text-fuchsia-200/90">High</span>
            </div>
            </>
          ) : null}
        </section>

        <aside
          className={`absolute right-0 top-16 z-[900] h-[calc(100dvh-4rem)] w-[360px] max-w-[92vw] border-l border-blue-300/25 bg-[#07173f]/88 backdrop-blur-sm transition-transform duration-300 ease-out ${
            activeDepartment ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {activeDepartment ? (
            <div className="h-full overflow-y-auto p-4">
              {isLoadingDepartments ? (
                <p className="mb-3 text-xs uppercase tracking-[0.12em] text-cyan-200/70">
                  Querying department index...
                </p>
              ) : null}
              {departmentsError ? (
                <p className="mb-3 rounded border border-amber-300/25 bg-amber-900/10 px-2 py-1 text-xs text-amber-200/85">
                  {departmentsError}
                </p>
              ) : null}
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/75">Department</p>
              <h2 className="mt-1 text-lg font-semibold text-[#e6efff]">{activeDepartment.district}</h2>
              {hasDisplayableAddress(activeDepartment.address) ? (
                <p className="mt-1 text-sm text-[#afc3ea]">{activeDepartment.address}</p>
              ) : null}
              <p className="mt-2 text-xs text-[#cfe2ff]">
                <span className="text-[#9eb7e7]">Severity score:</span>{" "}
                {activeDepartment.mapping_score != null
                  ? activeDepartment.mapping_score.toFixed(2)
                  : "N/A"}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-cyan-200/75">
                Officer Profiles
              </p>
              <div className="mt-2">
                <select
                  value={officerFilterMode}
                  onChange={(event) => setOfficerFilterMode(event.target.value as OfficerFilterMode)}
                  className="w-full rounded border border-blue-300/35 bg-[#101f4f]/80 px-2 py-1 text-xs text-[#d7e7ff] focus:outline-none"
                >
                  <option value="all">All officers</option>
                  <option value="complaints">Complaints percentile (top quartile)</option>
                  <option value="overtime">Overtime/base-pay percentile (top quartile)</option>
                </select>
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#cfe2ff]">
                <input
                  type="checkbox"
                  checked={sortOfficersByRank}
                  onChange={(event) => setSortOfficersByRank(event.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-cyan-300"
                />
                Sort by rank hierarchy (Captain -&gt; Officer)
              </label>

              <div className="mt-3 space-y-3">
                {visibleOfficers.map((officer) => (
                  <OfficerProfileCard
                    key={officer.id}
                    officerId={officer.id}
                    officerName={officer.name}
                    officerRank={officer.rank}
                    complaintsPercentile={officer.complaints_percentile}
                    overtimePercentile={officer.overtime_ratio_percentile}
                    district={activeDepartment.district}
                  />
                ))}
                {visibleOfficers.length === 0 ? (
                  <p className="rounded border border-blue-300/25 bg-[#0a1433]/70 px-2 py-2 text-xs text-[#b8c9eb]">
                    {noOfficersMessage}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}