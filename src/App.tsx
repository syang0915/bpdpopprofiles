import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import {
  PoliceDepartmentsLayer,
} from "@/components/map/police-departments-layer";
import { Button } from "@/components/ui/button";
import type { PoliceDepartment } from "@/components/map/police-department-marker";

const bostonBounds: LatLngBoundsExpression = [
  [42.2279, -71.1912],
  [42.3969, -70.986],
];

const policeDepartments: PoliceDepartment[] = [
  {
    id: "a-1",
    district: "Boston Police District A-1",
    address: "40 New Sudbury St, Boston, MA 02114",
    position: [42.3613, -71.0598],
    officers: [
      { id: "det-rivera", name: "Det. Rivera" },
      { id: "sgt-oneil", name: "Sgt. O'Neil" },
      { id: "officer-patel", name: "Officer Patel" },
      { id: "officer-kim", name: "Officer Kim" },
      { id: "officer-thomas", name: "Officer Thomas" },
      { id: "officer-murphy", name: "Officer Murphy" },
      { id: "officer-lee", name: "Officer Lee" },
      { id: "officer-hughes", name: "Officer Hughes" },
    ],
  },
];

function LockInitialBostonView() {
  const map = useMap();

  useEffect(() => {
    const initialZoom = map.getZoom();
    map.setMinZoom(initialZoom);
    map.setMaxBounds(bostonBounds);
    map.attributionControl.setPrefix(false);
  }, [map]);

  return null;
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b border-cyan-400/30 bg-[#070b1f]/95 backdrop-blur">
        <nav className="flex h-16 items-center justify-end px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button className="border border-cyan-300/45 bg-[#0b1d4a] text-[#b7c9ff] shadow-[0_0_16px_rgba(34,211,238,0.25)] hover:bg-[#13307a] hover:text-[#d8e4ff] hover:shadow-[0_0_22px_rgba(56,189,248,0.45)]">
              Map
            </Button>
            <Button className="border border-fuchsia-300/45 bg-[#2a0f52] text-[#c2b7ff] shadow-[0_0_16px_rgba(217,70,239,0.25)] hover:bg-[#3a1673] hover:text-[#e0d8ff] hover:shadow-[0_0_22px_rgba(192,132,252,0.45)]">
              Officers
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <MapContainer
          bounds={bostonBounds}
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
          <TileLayer
            className="cyberpunk-labels-layer"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains={["a", "b", "c", "d"]}
            opacity={0.9}
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          />
          <PoliceDepartmentsLayer departments={policeDepartments} />
        </MapContainer>
      </main>
    </div>
  );
}