import { useEffect, useMemo, useRef, useState } from "react";
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

const PULSE_DURATION_SECONDS = 1.6;

export function PoliceDepartmentMarker({ department }: PoliceDepartmentMarkerProps) {
  const [isMarkerHovered, setIsMarkerHovered] = useState(false);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const [fadeStrength, setFadeStrength] = useState(0);
  const closeTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const isHovered = isMarkerHovered || isPanelHovered;

  const setPanelRef = (node: HTMLDivElement | null) => {
    panelRef.current = node;
    if (!node) {
      return;
    }
    DomEvent.disableScrollPropagation(node);
    DomEvent.disableClickPropagation(node);
  };

  const updateListFade = () => {
    const list = listRef.current;
    if (!list) {
      setFadeStrength(0);
      return;
    }

    const maxScroll = list.scrollHeight - list.clientHeight;
    if (maxScroll <= 2) {
      setFadeStrength(0);
      return;
    }

    const remainingScroll = Math.max(0, maxScroll - list.scrollTop);
    const normalizedStrength = Math.min(1, remainingScroll / maxScroll);
    setFadeStrength(normalizedStrength);
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
    }, 900);
  };

  useEffect(() => {
    if (!isHovered) {
      setFadeStrength(0);
      return;
    }

    const frameId = window.requestAnimationFrame(updateListFade);
    return () => window.cancelAnimationFrame(frameId);
  }, [isHovered, department.officers.length]);

  const icon = useMemo(
    () => {
      // Use current wall-clock phase so markers re-sync even after hover re-renders.
      const pulsePhaseSeconds = (Date.now() / 1000) % PULSE_DURATION_SECONDS;
      return divIcon({
        className: `department-marker-container ${isHovered ? "is-hovered" : ""}`,
        html: `
          <span class="department-marker-core"></span>
          <span class="department-marker-ring" style="animation-delay:-${pulsePhaseSeconds.toFixed(3)}s;"></span>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    },
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
          direction="right"
          offset={[8, 0]}
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
            <div
              className="department-tooltip-list-wrap"
              style={{ ["--fade-strength" as string]: fadeStrength }}
            >
              <ul
                ref={listRef}
                className="department-tooltip-list"
                onScroll={updateListFade}
              >
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
          </div>
        </Tooltip>
      )}
    </Marker>
  );
}
