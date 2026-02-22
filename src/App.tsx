import { useEffect, useState, type CSSProperties } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import { PoliceDepartmentsLayer } from "@/components/map/police-departments-layer";
import { OfficerProfileCard } from "@/components/officer/officer-profile-card";
import { policeDepartments as fallbackDepartments } from "@/data/police-departments";
import { fetchPoliceDepartments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { PoliceDepartment } from "@/components/map/police-department-marker";

const bostonBounds: LatLngBoundsExpression = [
  [42.2279, -71.1912],
  [42.3969, -70.986],
];
const bostonCenter: [number, number] = [42.395, -71.0589];

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
  const [brandLight, setBrandLight] = useState({ x: 0, y: 0, active: false });
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<PoliceDepartment[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);

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
        const result = await fetchPoliceDepartments({ delayMs: 260 });
        if (isCancelled) {
          return;
        }
        setDepartments(result);
      } catch {
        if (isCancelled) {
          return;
        }
        // Keep the UI working even if API is unavailable.
        setDepartments(fallbackDepartments);
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

  const handleDepartmentToggle = (departmentId: string) => {
    setActiveDepartmentId((currentId) => (currentId === departmentId ? null : departmentId));
  };

  const activeDepartment = departments.find((department) => department.id === activeDepartmentId);

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
            activeDepartmentId={activeDepartmentId}
            onDepartmentToggle={handleDepartmentToggle}
          />
        </MapContainer>

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
              <p className="mt-1 text-sm text-[#afc3ea]">{activeDepartment.address}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-cyan-200/75">
                Officer Profiles
              </p>

              <div className="mt-3 space-y-3">
                {activeDepartment.officers.map((officer) => (
                  <OfficerProfileCard
                    key={officer.id}
                    officerId={officer.id}
                    district={activeDepartment.district}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}