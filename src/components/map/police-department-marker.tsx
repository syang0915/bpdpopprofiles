import { useMemo, useRef, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { DomEvent, divIcon, type LatLngExpression } from "leaflet";
import { Link } from "react-router-dom";

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
};

export function PoliceDepartmentMarker({ department }: PoliceDepartmentMarkerProps) {
  const [isMarkerHovered, setIsMarkerHovered] = useState(false);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isHovered = isMarkerHovered || isPanelHovered;

  const setPanelRef = (node: HTMLDivElement | null) => {
    panelRef.current = node;
    if (!node) {
      return;
    }
    DomEvent.disableScrollPropagation(node);
    DomEvent.disableClickPropagation(node);
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openTooltip = () => {
    clearCloseTimer();
    setIsMarkerHovered(true);
  };

  const closeTooltipWithDelay = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsMarkerHovered(false);
      setIsPanelHovered(false);
    }, 260);
  };

  const icon = useMemo(
    () =>
      divIcon({
        className: `department-marker-container ${isHovered ? "is-hovered" : ""}`,
        html: `
          <span class="department-marker-core"></span>
          <span class="department-marker-ring"></span>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    [isHovered],
  );

  return (
    <Marker
      position={department.position}
      icon={icon}
      eventHandlers={{
        mouseover: openTooltip,
        mouseout: () => {
          setIsMarkerHovered(false);
          closeTooltipWithDelay();
        },
      }}
    >
      {isHovered && (
        <Tooltip
          direction="auto"
          offset={[0, -12]}
          opacity={1}
          className="department-tooltip"
          permanent
          interactive
        >
          <div
            ref={setPanelRef}
            className="department-tooltip-panel"
            onMouseEnter={() => {
              clearCloseTimer();
              setIsPanelHovered(true);
            }}
            onMouseLeave={() => {
              setIsPanelHovered(false);
              closeTooltipWithDelay();
            }}
          >
            <div className="department-tooltip-title">{department.district}</div>
            <div className="department-tooltip-address">{department.address}</div>
            <div className="department-tooltip-label">Officers</div>
            <ul className="department-tooltip-list">
              {department.officers.map((officer) => (
                <li key={officer.id}>
                  <Link
                    to={`/officer/${officer.id}?district=${encodeURIComponent(department.district)}`}
                    className="department-tooltip-link"
                  >
                    {officer.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Tooltip>
      )}
    </Marker>
  );
}
