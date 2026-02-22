import { useEffect, useState, type CSSProperties } from "react";
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
const bostonCenter: [number, number] = [42.395, -71.0589];

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
  {
    id: "a-7",
    district: "Boston Police District A-7",
    address: "69 Paris St, East Boston, MA 02128",
    position: [42.3706, -71.0382],
    officers: [
      { id: "officer-diaz", name: "Officer Diaz" },
      { id: "officer-vasquez", name: "Officer Vasquez" },
      { id: "sgt-carter", name: "Sgt. Carter" },
      { id: "det-morales", name: "Det. Morales" },
      { id: "officer-nguyen", name: "Officer Nguyen" },
      { id: "officer-walker", name: "Officer Walker" },
    ],
  },
  {
    id: "b-2",
    district: "Boston Police District B-2",
    address: "135 Dudley St, Roxbury, MA 02119",
    position: [42.3296, -71.0846],
    officers: [
      { id: "officer-bennett", name: "Officer Bennett" },
      { id: "officer-johnson", name: "Officer Johnson" },
      { id: "det-harris", name: "Det. Harris" },
      { id: "sgt-martinez", name: "Sgt. Martinez" },
      { id: "officer-price", name: "Officer Price" },
      { id: "officer-coleman", name: "Officer Coleman" },
    ],
  },
  {
    id: "c-11",
    district: "Boston Police District C-11",
    address: "40 Gibson St, Dorchester, MA 02122",
    position: [42.2946, -71.0596],
    officers: [
      { id: "officer-reed", name: "Officer Reed" },
      { id: "officer-sullivan", name: "Officer Sullivan" },
      { id: "sgt-ellis", name: "Sgt. Ellis" },
      { id: "det-clarke", name: "Det. Clarke" },
      { id: "officer-hayes", name: "Officer Hayes" },
      { id: "officer-ross", name: "Officer Ross" },
    ],
  },
  {
    id: "d-4",
    district: "Boston Police District D-4",
    address: "1499 Tremont St, Boston, MA 02120",
    position: [42.3337, -71.0984],
    officers: [
      { id: "officer-flores", name: "Officer Flores" },
      { id: "officer-brooks", name: "Officer Brooks" },
      { id: "sgt-gray", name: "Sgt. Gray" },
      { id: "det-allen", name: "Det. Allen" },
      { id: "officer-ward", name: "Officer Ward" },
      { id: "officer-james", name: "Officer James" },
    ],
  },
  {
    id: "e-18",
    district: "Boston Police District E-18",
    address: "1165 Hyde Park Ave, Hyde Park, MA 02136",
    position: [42.2576, -71.1254],
    officers: [
      { id: "officer-owens", name: "Officer Owens" },
      { id: "officer-doyle", name: "Officer Doyle" },
      { id: "sgt-ford", name: "Sgt. Ford" },
      { id: "det-nash", name: "Det. Nash" },
      { id: "officer-riley", name: "Officer Riley" },
      { id: "officer-santos", name: "Officer Santos" },
    ],
  },
];

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

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

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
          <PoliceDepartmentsLayer departments={policeDepartments} />
        </MapContainer>
      </main>
    </div>
  );
}