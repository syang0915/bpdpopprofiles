import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import { Button } from "@/components/ui/button";

const bostonBounds: LatLngBoundsExpression = [
  [42.2279, -71.1912],
  [42.3969, -70.986],
];

function LockInitialBostonView() {
  const map = useMap();

  useEffect(() => {
    const initialZoom = map.getZoom();
    map.setMinZoom(initialZoom);
    map.setMaxBounds(bostonBounds);
  }, [map]);

  return null;
}

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <nav className="flex h-16 items-center justify-end px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button>Map</Button>
            <Button>Officers</Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <MapContainer
          bounds={bostonBounds}
          maxZoom={18}
          maxBounds={bostonBounds}
          maxBoundsViscosity={1.0}
          className="h-full w-full"
        >
          <LockInitialBostonView />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </main>
    </div>
  );
}