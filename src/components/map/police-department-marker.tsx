import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { divIcon, type LatLngExpression } from "leaflet";

type Officer = {
  id: string;
  name: string;
};

export type PoliceDepartment = {
  id: string;
  district: string;
  address: string;
  position: LatLngExpression;
  officers: Officer[];
};

type PoliceDepartmentMarkerProps = {
  department: PoliceDepartment;
  isActive: boolean;
  onToggle: (departmentId: string) => void;
};

const PULSE_DURATION_SECONDS = 1.6;

export function PoliceDepartmentMarker({
  department,
  isActive,
  onToggle,
}: PoliceDepartmentMarkerProps) {
  const icon = useMemo(
    () => {
      // Use current wall-clock phase so markers re-sync even after hover re-renders.
      const pulsePhaseSeconds = (Date.now() / 1000) % PULSE_DURATION_SECONDS;
      return divIcon({
        className: `department-marker-container ${isActive ? "is-hovered" : ""}`,
        html: `
          <span class="department-marker-core"></span>
          <span class="department-marker-ring" style="animation-delay:-${pulsePhaseSeconds.toFixed(3)}s;"></span>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    },
    [isActive],
  );

  return (
    <Marker
      position={department.position}
      icon={icon}
      eventHandlers={{
        click: () => onToggle(department.id),
      }}
    />
  );
}
