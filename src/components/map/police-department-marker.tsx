import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { divIcon, type LatLngExpression } from "leaflet";

type Officer = {
  id: string;
  name: string;
  rank?: string | null;
  complaints_percentile?: number | null;
  overtime_ratio_percentile?: number | null;
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

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDistrictCode(department: PoliceDepartment) {
  const districtMatch = department.district.toUpperCase().match(/([A-Z])\s*-\s*(\d{1,2})/);
  if (districtMatch) {
    return `${districtMatch[1]}${districtMatch[2]}`;
  }

  const idMatch = department.id.toUpperCase().match(/([A-Z])\s*-\s*(\d{1,2})/);
  if (idMatch) {
    return `${idMatch[1]}${idMatch[2]}`;
  }

  return department.id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function PoliceDepartmentMarker({
  department,
  isActive,
  onToggle,
}: PoliceDepartmentMarkerProps) {
  const icon = useMemo(
    () => {
      // Use current wall-clock phase so markers re-sync even after hover re-renders.
      const pulsePhaseSeconds = (Date.now() / 1000) % PULSE_DURATION_SECONDS;
      const districtCode = getDistrictCode(department);
      return divIcon({
        className: `department-marker-container ${isActive ? "is-hovered" : ""}`,
        html: `
          <span class="department-marker-core"></span>
          <span class="department-marker-ring" style="animation-delay:-${pulsePhaseSeconds.toFixed(3)}s;"></span>
          <span class="department-marker-label">${escapeHtml(districtCode)}</span>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    },
    [department.district, department.id, isActive],
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
